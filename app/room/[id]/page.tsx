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

  const { hostPoints, sendHostPoints } = useCalibrationSync({ socket, code: roomCode, isRef: isHost });

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
