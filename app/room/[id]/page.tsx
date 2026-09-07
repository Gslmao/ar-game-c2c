"use client";

import { useEffect, useState } from "react";

import { useSocket } from "@/app/provider";
import ARScene from "@/components/cam/ar-cam";

export default function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { socket } = useSocket();
  const [roomCode, setRoomCode] = useState("");

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

  return <ARScene socket={socket} roomCode={roomCode} />;
}
