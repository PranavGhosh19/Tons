/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";
import {onDocumentWritten, onDocumentCreated} from "firebase-functions/v2/firestore";
import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {CloudTasksClient} from "@google-cloud/tasks";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// -----------------------------------------------------------------------------
// Cloud Tasks Configuration
// -----------------------------------------------------------------------------
const PROJECT_ID = "cargoflow-j35du";
const QUEUE_LOCATION = "us-central1";
const QUEUE_ID = "shipment-go-live-queue";

// This must be a service account with Cloud Tasks Enqueuer role
const SERVICE_ACCOUNT_EMAIL =
    `cloud-tasks-invoker@${PROJECT_ID}.iam.gserviceaccount.com`;

const tasksClient = new CloudTasksClient();

// Set default region globally
setGlobalOptions({region: "us-central1", maxInstances: 10});

// -----------------------------------------------------------------------------
// Notification Helpers
// -----------------------------------------------------------------------------
interface Notification {
    recipientId: string;
    message: string;
    link: string;
    isRead: boolean;
    createdAt: admin.firestore.FieldValue;
}

/**
 * Creates a notification document in Firestore.
 * @param {Notification} notification The notification object.
 */
async function createNotification(notification: Omit<Notification, "isRead" | "createdAt">) {
  try {
    await db.collection("notifications").add({
      ...notification,
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.log(`Notification created for ${notification.recipientId}`);
  } catch (error) {
    logger.error(`Error creating notification for ${notification.recipientId}:`, error);
  }
}


/**
 * Creates or updates a Cloud Task to trigger a shipment go-live event.
 * This function is triggered whenever a document in the 'shipments'
 * collection is written to (created or updated).
 */
export const onShipmentWrite = onDocumentWritten(
    "shipments/{shipmentId}",
    async (event) => {
      const shipmentId = event.params.shipmentId;
      const beforeData = event.data?.before.data();
      const afterData = event.data?.after.data();

      // --- Task Deletion Logic ---
      // If a task was scheduled for the previous version, delete it.
      if (beforeData?.goLiveTaskName) {
        logger.log("Deleting previous task:", beforeData.goLiveTaskName);
        await tasksClient.deleteTask({name: beforeData.goLiveTaskName})
            .catch((err) => {
              if (err.code !== 5) { // 5 = NOT_FOUND
                logger.error("Failed to delete previous task", err);
              }
            });
      }
      
      // --- Status Change Notifications (Awarded) ---
      if (beforeData?.status !== "awarded" && afterData?.status === "awarded") {
        if (afterData.winningCarrierId && afterData.productName) {
           await createNotification({
              recipientId: afterData.winningCarrierId,
              message: `Congratulations! You've won the bid for the '${afterData.productName}' shipment.`,
              link: `/dashboard/shipment/${shipmentId}`,
           });
        }
      }

      // --- Task Creation Logic ---
      // If not 'scheduled' or no go-live time, do nothing.
      if (!afterData ||
        afterData.status !== "scheduled" ||
        !afterData.goLiveAt) {
        logger.log(
            `Shipment ${shipmentId} is not scheduled. No task created.`);
        return;
      }

      const goLiveAt = afterData.goLiveAt.toDate();
      const now = new Date();
      if (goLiveAt <= now) {
        logger.log(`Shipment ${shipmentId} goLiveAt is in the past. Skipping task creation.`);
        return;
      }

      const task = {
        httpRequest: {
          httpMethod: "POST" as const,
          url: `https://${QUEUE_LOCATION}-${PROJECT_ID}.cloudfunctions.net/executeShipmentGoLive`,
          headers: {"Content-Type": "application/json"},
          body: Buffer.from(JSON.stringify({shipmentId})).toString("base64"),
          oidcToken: {
            serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
          },
        },
        scheduleTime: {
          seconds: Math.floor(goLiveAt.getTime() / 1000),
        },
      };

      try {
        const queuePath = tasksClient.queuePath(PROJECT_ID, QUEUE_LOCATION, QUEUE_ID);
        const [response] = await tasksClient.createTask({
          parent: queuePath,
          task,
        });

        logger.log(`Created task ${response.name} for shipment ${shipmentId}`);
        await db.collection("shipments").doc(shipmentId).update({
          goLiveTaskName: response.name,
        });
      } catch (error) {
        logger.error(`Error creating task for shipment ${shipmentId}:`, error);
      }
    },
);

/**
 * Creates a notification when a new bid is placed on a shipment.
 */
export const onBidCreate = onDocumentCreated("shipments/{shipmentId}/bids/{bidId}", async (event) => {
    const shipmentId = event.params.shipmentId;
    const bidData = event.data?.data();

    if (!bidData) {
        logger.log("No bid data found, cannot create notification.");
        return;
    }

    try {
        const shipmentDoc = await db.collection("shipments").doc(shipmentId).get();
        if (shipmentDoc.exists) {
            const shipmentData = shipmentDoc.data();
            if (shipmentData && shipmentData.exporterId) {
                await createNotification({
                    recipientId: shipmentData.exporterId,
                    message: `You have a new bid of $${bidData.bidAmount} on your '${shipmentData.productName}' shipment.`,
                    link: `/dashboard/shipment/${shipmentId}`,
                });
            }
        }
    } catch (error) {
        logger.error(`Error fetching shipment ${shipmentId} for new bid notification:`, error);
    }
});


/**
 * The secure HTTP endpoint called by Cloud Tasks to set a shipment to 'live'.
 */
export const executeShipmentGoLive = onRequest(async (req, res) => {
  const {shipmentId} = req.body;

  if (!shipmentId) {
    logger.error("HTTP request missing shipmentId in body");
    res.status(400).send("Bad Request: Missing shipmentId");
    return;
  }

  try {
    const shipmentRef = db.collection("shipments").doc(shipmentId);
    const doc = await shipmentRef.get();

    if (!doc.exists) {
      logger.warn(`Shipment ${shipmentId} not found for go-live execution.`);
      res.status(404).send("Not Found");
      return;
    }
    
    const shipmentData = doc.data();

    // Only update if the shipment is still in the 'scheduled' state.
    if (shipmentData?.status === "scheduled") {
      await shipmentRef.update({status: "live"});
      logger.log("Set shipment", shipmentId, "to 'live' via Cloud Task.");

      // --- Notify Registered Carriers ---
      const registrationsRef = shipmentRef.collection("register");
      const registrationsSnap = await registrationsRef.get();

      if (!registrationsSnap.empty) {
        const notifications = registrationsSnap.docs.map((regDoc) => {
            const carrierId = regDoc.id;
            return createNotification({
                recipientId: carrierId,
                message: `The shipment '${shipmentData.productName}' is now live for bidding!`,
                link: `/dashboard/carrier/shipment/${shipmentId}`,
            });
        });
        await Promise.all(notifications);
        logger.log(`Sent ${notifications.length} go-live notifications for shipment ${shipmentId}.`);
      }

      res.status(200).send("OK");
    } else {
      logger.log(
          `Shipment ${shipmentId} not 'scheduled'. No action taken.`
      );
      res.status(200).send("No action needed.");
    }
  } catch (error) {
    logger.error(
        `Error executing go-live for shipment ${shipmentId}:`,
        error
    );
    res.status(500).send("Internal Server Error");
  }
});
