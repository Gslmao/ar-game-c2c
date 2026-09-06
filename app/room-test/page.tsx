"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CircleAlert,
  Copy,
  DoorOpen,
  Gamepad2,
  LoaderCircle,
  Wifi,
  WifiOff,
} from "lucide-react";

import { useSocket } from "@/app/provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type RoomCreatedPayload = { code: string };
type RoomResponse = { code?: string; error?: string };
type MatchFoundPayload = { code: string };

type Status =
  | "idle"
  | "waiting-for-opponent"
  | "matched"
  | "opponent-left"
  | `error: ${string}`;

export default function RoomTest() {
  const { socket, connected } = useSocket();

  const [code, setCode] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (!socket) return;

    const onRoomCreated = (data: RoomCreatedPayload) => {
      setCode(data.code);
      console.log("Room created with code:", data.code);
      setStatus("waiting-for-opponent");
    };

    const onMatchFound = ({ code: matchedCode }: MatchFoundPayload) => {
      setCode(matchedCode);
      setStatus("matched");
    };

    const onOpponentLeft = () => {
      setStatus("opponent-left");
    };

    socket.on("room-created", onRoomCreated);
    socket.on("match-found", onMatchFound);
    socket.on("opponent-left", onOpponentLeft);

    return () => {
      socket.off("room-created", onRoomCreated);
      socket.off("match-found", onMatchFound);
      socket.off("opponent-left", onOpponentLeft);
    };
  }, [socket]);

  const createRoom = () => {
    socket?.emit("create-room", (response: RoomResponse) => {
      if (response.error) {
        setStatus(`error: ${response.error}`);
      }
    });
  };

  const joinRoom = () => {
    const roomCode = joinInput.trim();

    if (!roomCode) return;

    socket?.emit("join-room", roomCode, (response: RoomResponse) => {
      if (response.error) {
        setStatus(`error: ${response.error}`);
        return;
      }

      if (response.code) {
        setCode(response.code);
        setStatus("waiting-for-opponent");
      }
    });
  };

  const leaveRoom = () => {
    socket?.emit("leave-room", code);
    setStatus("idle");
    setCode("");
  };

  const copyCode = async () => {
    if (code) {
      await navigator.clipboard.writeText(code);
    }
  };

  const statusLabel =
    status === "idle"
      ? "Ready to play"
      : status === "waiting-for-opponent"
        ? "Waiting for an opponent"
        : status === "matched"
          ? "Opponent found"
          : status === "opponent-left"
            ? "Your opponent left"
            : status.replace("error: ", "");

  const isError = status.startsWith("error:");

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gamepad2 className="size-5" />
              <span className="font-semibold">Playroom</span>
            </div>

            <Badge variant={connected ? "secondary" : "destructive"}>
              {connected ? (
                <Wifi className="mr-1 size-3" />
              ) : (
                <WifiOff className="mr-1 size-3" />
              )}
              {connected ? "Online" : "Offline"}
            </Badge>
          </div>

          <CardTitle className="pt-4 text-2xl">
            Find your next match
          </CardTitle>

          <CardDescription>
            Create a room for a friend, or enter their code to join.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant={isError ? "destructive" : "default"}>
            {isError ? (
              <CircleAlert className="size-4" />
            ) : status === "waiting-for-opponent" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <div className="size-2 rounded-full bg-current" />
            )}

            <AlertTitle>{statusLabel}</AlertTitle>

            <AlertDescription>
              {connected
                ? "Your connection is ready."
                : "Connect to the server to play."}
            </AlertDescription>
          </Alert>

          {code && (
            <div className="rounded-md border bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  ROOM CODE
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyCode}
                  type="button"
                >
                  <Copy className="mr-2 size-4" />
                  Copy
                </Button>
              </div>

              <p className="mt-2 break-all font-mono text-2xl font-bold tracking-widest">
                {code}
              </p>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={createRoom}
            disabled={!connected}
            type="button"
          >
            Create a room
            <ArrowRight className="ml-2 size-4" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex gap-2">
            <Input
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  joinRoom();
                }
              }}
              placeholder="Enter room code"
            />

            <Button
              onClick={joinRoom}
              disabled={!connected || !joinInput.trim()}
              type="button"
            >
              Join
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>

          {code && (
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={leaveRoom}
              type="button"
            >
              <DoorOpen className="mr-2 size-4" />
              Leave room
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
