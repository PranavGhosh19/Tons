"use client";

/**
 * This is a CLIENT-SIDE-ONLY component that is not rendered to the DOM.
 * It listens for custom 'permission-error' events and throws them as
 * errors that can be caught by Next.js's development error overlay.
 * This is crucial for debugging Firestore security rules.
 */

import { useEffect, useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { type FirestorePermissionError } from '@/firebase/errors';

/**
 * A client-side-only component that surfaces Firestore permission errors
 * to the Next.js development error overlay.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (e: FirestorePermissionError) => {
      setError(e);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  if (error) {
    // This will be caught by the Next.js error overlay
    throw error;
  }

  return null;
}