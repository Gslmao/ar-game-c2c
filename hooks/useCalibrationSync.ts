"use client";

import { useCallback, useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import type { Point2D } from "@/lib/calibration";

interface UseCalibrationSyncArgs {
  socket: Socket | null;
  code: string;
  isRef: boolean;
}

interface UseCalibrationSyncResult {
  // Host's points, once the server broadcasts them. Stays null on the
  // guest until that happens, and stays null on the host permanently
  // (it doesn't need its own points echoed back).
  hostPoints: Point2D[] | null;
  // Call once the host's own tap-to-calibrate flow finishes. No-op on
  // a non-host client — computeTransform only ever runs on the guest,
  // so only the host should ever call this.
  sendHostPoints: (points: Point2D[]) => void;
  acceptHostPoints: (points: Point2D[]) => void;
}

export function useCalibrationSync({
  socket,
  code,
  isRef,
}: UseCalibrationSyncArgs): UseCalibrationSyncResult {
  const [hostPoints, setHostPoints] = useState<Point2D[] | null>(null);

  const acceptHostPoints = useCallback((points: Point2D[]) => {
    console.warn("[CALIBRATION][GUEST] received host points", {
      code,
      pointCount: points.length,
      points,
      source: "join-room-ack",
    });
    setHostPoints(points);
  }, [code]);

  useEffect(() => {
    if (!socket) return;

    const onHostCalibrationPoints = (payload: { points: Point2D[] }) => {
      acceptHostPoints(payload.points);
    };

    socket.on("host-calibration-points", onHostCalibrationPoints);

    return () => {
      socket.off("host-calibration-points", onHostCalibrationPoints);
    };
  }, [acceptHostPoints, socket]);

  const sendHostPoints = (points: Point2D[]) => {
    if (!isRef) {
      console.warn("sendHostPoints called on a non-host client — ignored.");
      return;
    }

    console.warn("[CALIBRATION][HOST] sending host points", {
      code,
      pointCount: points.length,
      points,
    });
    socket?.emit("host-calibration-points", { code, points });
  };

  return { hostPoints, sendHostPoints, acceptHostPoints };
}
