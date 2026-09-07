"use client";

import { useEffect, useState } from "react";
import { useCalibrationSync } from '@/hooks/useCalibrationSync'
import { useSocket } from "@/app/provider";
import ARScene from "@/components/cam/ar-cam";
import { useSearchParams } from "next/navigation";
import type { Point2D } from "@/lib/calibration";

export default function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { socket } = useSocket();
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState("");

  const isHost = searchParams.get("role") === "host";

  const { hostPoints, sendHostPoints, acceptHostPoints } = useCalibrationSync({
    socket,
    code: roomCode,
    isRef: isHost,
  });

  const handleCalibrationComplete = (points: Point2D[]) => {
    if (isHost) sendHostPoints(points);
  };
  useEffect(() => {
    let mounted = true;

    params.then(({ id }) => {
      if (mounted) {
        setRoomCode(decodeURIComponent(id));
      }
    });

    return () => {
      mounted = false;
    };
  }, [params]);

  useEffect(() => {
    if (!socket || !roomCode) return;

    const ensureRoomMembership = () => {
      console.warn("[ROOM] ensuring socket is in room", {
        code: roomCode,
        role: isHost ? "HOST" : "GUEST",
        socketId: socket.id,
      });

      socket.emit(
        "join-room",
        roomCode,
        (response: {
          code?: string;
          error?: string;
          calibrationPoints?: Point2D[];
        }) => {
          if (response?.error && response.error !== "Already in this room") {
            console.error("[ROOM] failed to join room", {
              code: roomCode,
              role: isHost ? "HOST" : "GUEST",
              error: response.error,
            });
            return;
          }

          if (!isHost && response.calibrationPoints?.length) {
            acceptHostPoints(response.calibrationPoints);
          }

          console.warn("[ROOM] socket room membership confirmed", {
            code: roomCode,
            role: isHost ? "HOST" : "GUEST",
            response,
          });
        }
      );
    };

    if (socket.connected) ensureRoomMembership();
    socket.on("connect", ensureRoomMembership);

    return () => {
      socket.off("connect", ensureRoomMembership);
    };
  }, [socket, roomCode, isHost, acceptHostPoints]);

  return (
    <ARScene
      socket={socket}
      roomCode={roomCode}
      isHost={isHost}
      hostPoints={hostPoints}
      onCalibrationComplete={handleCalibrationComplete}
    />
  );
}
