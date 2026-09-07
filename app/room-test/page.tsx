"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Copy,
  DoorOpen,
  LoaderCircle,
} from "lucide-react";

import { useSocket } from "@/app/provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SineWaveMesh } from "@/components/sine-wave-mesh";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [code, setCode] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [isRef, setIsRef] = useState<boolean>(false);

  useEffect(() => {
    if (!socket) return;

    const onRoomCreated = (data: RoomCreatedPayload) => {
      setCode(data.code);
      console.log("Room created with code:", data.code);
      setStatus("waiting-for-opponent");
      setIsRef(true);
    };

    const onMatchFound = ({ code: matchedCode }: MatchFoundPayload) => {
      setCode(matchedCode);
      setStatus("matched");
      setIsRef(false);
    };

    const onOpponentLeft = () => {
      setStatus("opponent-left");
    };

    socket.on("room-created", onRoomCreated);
    socket.on("match-found", onMatchFound);
    socket.on("opponent-left", onOpponentLeft);

    socket.on("server-message", (message : {message: string, sentAt: number}) => {
      console.log("Server message:", message);
      setCount(message.sentAt);
    });

    return () => {
      socket.off("room-created", onRoomCreated);
      socket.off("match-found", onMatchFound);
      socket.off("opponent-left", onOpponentLeft);
    };
  }, [socket]);

  useEffect(() => {
    if (status !== "idle"){
      socket?.emit("start-message-interval", code);
    }
  }, [socket, code, status])
  
  const createRoom = () => {
    socket?.emit("create-room", (response: RoomResponse) => {
      if (response.error) {
        setStatus(`error: ${response.error}`);
      }
    });
  };

  const stopMsg = () => {
    socket?.emit("stop-message-interval", (response: RoomResponse) => {
      if (response.error) {
        setStatus(`error: ${response.error}`);
      }
    });
  }

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
    setShowJoinInput(false);
    setJoinInput("");
  };

  const copyCode = async () => {
    if (code) {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navigateToRoom = () => {
    if (status === "matched" && code) {
      router.push(`/room/${encodeURIComponent(code)}?ref=${isRef}`);
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
    <main className="relative min-h-screen bg-[#08090d] text-white overflow-hidden flex flex-col items-center justify-center p-4 selection:bg-white/20 selection:text-white">
      {/* Background with themed ambient glows and animated sine-wave grid */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-purple-600/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[10%] w-[450px] h-[450px] bg-blue-500/10 blur-[140px] rounded-full" />

        {/* Dynamic Sine-Wave Grid Mesh Animation */}
        <SineWaveMesh />
      </div>

      <Button onClick={stopMsg} variant="destructive" className="absolute top-4 right-4">
        number: {count}
      </Button>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Navigation / Header back link */}
        <div className="w-full flex items-center justify-between mb-4 px-1">
          <Link
            href="/landing"
            className="inline-flex items-center gap-2 text-xs font-medium text-white/50 hover:text-white transition-colors group cursor-pointer"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Back to Arcade</span>
          </Link>

          <span className="text-[11px] font-mono tracking-widest text-white/40 uppercase">
            AR Matchmaking
          </span>
        </div>

        {/* The Box Card */}
        
      <Card className="w-full rounded-2xl border border-white/10 bg-[#0e1017]/90 backdrop-blur-xl text-white shadow-2xl overflow-hidden">
          {/* Top subtle edge highlight */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
          />

          <CardHeader className="space-y-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Cyber AR Badge */}
                <div className="relative w-8 h-8 rounded-lg bg-[#141721] border border-white/20 flex items-center justify-center shadow-inner">
                  <span className="font-black text-[11px] tracking-wider text-white">
                    AR
                  </span>
                </div>

                <div>
                  <span className="font-bold tracking-tight text-base text-white">
                    ARCADE Playroom
                  </span>
                </div>
              </div>

              {/* Connection Status Badge */}
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-md transition-colors",
                  connected
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-red-500/30 bg-red-500/10 text-red-400"
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                  )}
                />
                {connected ? "Online" : "Offline"}
              </div>
            </div>

            <div>
              <CardTitle className="pt-2 text-2xl font-bold tracking-tight text-white">
                Find your next match
              </CardTitle>

              <CardDescription className="text-white/60 text-sm mt-1">
                Create a room for a friend, or enter their code to join.
              </CardDescription>
            </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-1">
              {/* Status Alert */}
              <div
                className={cn(
                  "relative flex items-start gap-3 rounded-xl border p-3.5 text-sm transition-colors",
                  isError
                    ? "border-red-500/30 bg-red-500/10 text-red-200"
                    : status === "matched"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      : "border-white/10 bg-white/[0.03] text-white/80"
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {isError ? (
                    <CircleAlert className="size-4 text-red-400" />
                  ) : status === "waiting-for-opponent" ? (
                    <LoaderCircle className="size-4 animate-spin text-white/70" />
                  ) : status === "matched" ? (
                    <div className="size-2 rounded-full bg-emerald-400 animate-pulse mt-1" />
                  ) : (
                    <div className="size-2 rounded-full bg-white/60 mt-1" />
                  )}
                </div>

                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="font-semibold text-white tracking-wide">
                    {statusLabel}
                  </div>
                  <div className="text-xs text-white/60">
                    {status === "waiting-for-opponent"
                      ? "Share the code below with your opponent to connect."
                      : status === "matched"
                        ? "Opponent connected! Match ready."
                        : status === "opponent-left"
                          ? "Your opponent has disconnected."
                          : connected
                            ? "Connected to matchmaking server."
                            : "Connecting to server..."}
                  </div>
                </div>
              </div>

              {/* Room Code Display when created / joined */}
              {code && (
                <div className="rounded-xl border border-white/15 bg-white/[0.04] p-4 backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold tracking-wider text-white/50 uppercase">
                      ROOM CODE
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyCode}
                      type="button"
                      className="h-7 px-2.5 text-xs text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="mr-1.5 size-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">
                            Copied!
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1.5 size-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="mt-2 break-all font-mono text-3xl font-extrabold tracking-widest text-white">
                    {code}
                  </p>
                </div>
              )}

              {/* Action buttons (only show Create / Join when not currently in a room) */}
              {!code && (
                <>
                  <Button
                    className="w-full h-11 bg-white text-black hover:bg-white/90 font-bold transition-all duration-200 shadow-[0_0_25px_rgba(255,255,255,0.15)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    size="lg"
                    onClick={createRoom}
                    disabled={!connected}
                    type="button"
                  >
                    <span>Create a room</span>
                    <ArrowRight className="ml-2 size-4" />
                  </Button>

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[11px] font-medium tracking-wider text-white/40">
                      OR
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  {/* Join Section: Enter room code input is visible only after clicking "Join ->" */}
                  {!showJoinInput ? (
                    <Button
                      variant="outline"
                      className="w-full h-11 border-white/15 bg-white/[0.04] hover:bg-white/[0.09] text-white hover:text-white font-semibold transition-all duration-200 hover:border-white/30 group cursor-pointer"
                      size="lg"
                      onClick={() => setShowJoinInput(true)}
                      disabled={!connected}
                      type="button"
                    >
                      <span>Join</span>
                      <ArrowRight className="ml-2 size-4 transition-transform duration-200 group-hover:translate-x-1 text-white/70 group-hover:text-white" />
                    </Button>
                  ) : (
                    <div className="space-y-2 transition-all duration-300">
                      <div className="flex gap-2">
                        <Input
                          autoFocus
                          value={joinInput}
                          onChange={(e) => setJoinInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              joinRoom();
                            }
                          }}
                          placeholder="Enter room code"
                          className="h-11 bg-white/[0.05] border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/20 focus-visible:border-white/40 font-mono tracking-widest text-base sm:text-sm"
                        />

                        <Button
                          onClick={joinRoom}
                          disabled={!connected || !joinInput.trim()}
                          type="button"
                          className="h-11 px-5 bg-white text-black hover:bg-white/90 font-bold transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.15)] shrink-0"
                        >
                          <span>Join</span>
                          <ArrowRight className="ml-1.5 size-4" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] text-white/40">
                          Enter your friend&apos;s 6-character room code
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowJoinInput(false);
                            setJoinInput("");
                          }}
                          className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Leave room action */}
              {code && (
                <Button
                  variant="ghost"
                  className="w-full text-white/60 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                  onClick={leaveRoom}
                  type="button"
                >
                  <DoorOpen className="mr-2 size-4" />
                  <span>Leave room</span>
                </Button>
              )}
            </CardContent>
          </Card>
      </div>
    </main>
  );
}
