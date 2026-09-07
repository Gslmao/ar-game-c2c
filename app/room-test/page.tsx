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
  Gamepad2,
  KeyRound,
  LoaderCircle,
  Plus,
} from "lucide-react";

import { useSocket } from "@/app/provider";
import { Button } from "@/components/ui/button";
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
      setStatus("waiting-for-opponent");
      setIsRef(true);
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

    socket.on("server-message", (message: { message: string; sentAt: number }) => {
      setCount(message.sentAt);
    });

    return () => {
      socket.off("room-created", onRoomCreated);
      socket.off("match-found", onMatchFound);
      socket.off("opponent-left", onOpponentLeft);
    };
  }, [socket]);

  useEffect(() => {
    if (status !== "idle") {
      socket?.emit("start-message-interval", code);
    }
  }, [socket, code, status]);

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
    setJoinInput("");
    setShowJoinInput(false);
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
      router.push(`/room/${encodeURIComponent(code)}?role=${isRef ? 'host' : 'guest'}`);
    }
  };

  const isError = status.startsWith("error:");
  const errorMessage = isError ? status.replace("error: ", "") : "";

  return (
    <main className="relative min-h-screen bg-[#08090d] text-white overflow-hidden flex flex-col items-center justify-center p-4 selection:bg-white/20 selection:text-white">
      {/* Game Station Background with Constant Sine Waves Strictly in Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-zinc-800/15 blur-[160px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[10%] w-[450px] h-[450px] bg-zinc-800/10 blur-[160px] rounded-full" />

        {/* Gaming Crosshairs & Station Grid Telemetry */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, #ffffff 1px, transparent 1px),
              linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px, 120px 120px, 120px 120px",
          }}
        />

        {/* Dynamic Sine-Wave Grid Mesh strictly background z-0 */}
        <SineWaveMesh />
      </div>

      {/* Main Interactive Deck Elevated above waves */}
      <div className="relative z-20 w-full max-w-2xl flex flex-col items-center">
        {/* Navigation & Telemetry Bar */}
        <div className="w-full flex items-center justify-between mb-6 px-1">
          <Link
            href="/landing"
            className="inline-flex items-center gap-2 text-xs font-medium text-white/60 hover:text-white transition-colors group cursor-pointer"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Back to Arcade</span>
          </Link>

          {/* Discreet connection and packet control pill */}
          <div className="flex items-center gap-2">
            {count > 0 && (
              <button
                type="button"
                onClick={stopMsg}
                title="Click to pause sync packets"
                className="px-2 py-0.5 rounded-md border border-white/10 bg-[#0e1017] hover:bg-white/10 text-[11px] font-mono text-white/60 hover:text-white transition cursor-pointer"
              >
                Sync: {count}
              </button>
            )}

            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-[#0e1017] transition-colors",
                connected
                  ? "border-emerald-500/20 text-emerald-400"
                  : "border-red-500/20 text-red-400"
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  connected ? "bg-emerald-400" : "bg-red-400"
                )}
              />
              {connected ? "Online" : "Offline"}
            </div>
          </div>
        </div>

        {/* Error Alert (if present) */}
        {isError && (
          <div className="w-full mb-4 flex items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3.5 text-sm text-red-200">
            <CircleAlert className="size-4 shrink-0 text-red-400" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* STATE 1: NOT IN A ROOM -> Unique Dual-Station Command Deck */}
        {!code ? (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Host Station */}
            <div className="rounded-2xl border border-white/10 bg-[#0e1017] p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all hover:border-white/20">
              <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

              <div>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/80">
                    <Gamepad2 className="size-5" />
                  </div>
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-white/50">
                    HOST
                  </span>
                </div>

                <h2 className="text-xl font-bold tracking-tight text-white mt-5">
                  Host Match
                </h2>
                <p className="text-xs text-white/50 mt-1.5 leading-relaxed">
                  Generate a private room session and invite your opponent.
                </p>
              </div>

              <div className="mt-8">
                <Button
                  onClick={createRoom}
                  disabled={!connected}
                  type="button"
                  className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-bold text-sm rounded-xl transition duration-150 active:scale-[0.98] cursor-pointer shadow-sm flex items-center justify-center gap-2"
                >
                  <Plus className="size-4" />
                  <span>Create Room</span>
                </Button>
              </div>
            </div>

            {/* Join Station */}
            <div className="rounded-2xl border border-white/10 bg-[#0e1017] p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all hover:border-white/20">
              <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

              <div>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/80">
                    <KeyRound className="size-5" />
                  </div>
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-white/50">
                    JOIN
                  </span>
                </div>

                <h2 className="text-xl font-bold tracking-tight text-white mt-5">
                  Join Match
                </h2>
                <p className="text-xs text-white/50 mt-1.5 leading-relaxed">
                  Enter an existing code to connect directly to the lobby.
                </p>
              </div>

              {/* Initial Join Room Button matching Create Room button */}
              {!showJoinInput ? (
                <div className="mt-8">
                  <Button
                    onClick={() => setShowJoinInput(true)}
                    disabled={!connected}
                    type="button"
                    className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-bold text-sm rounded-xl transition duration-150 active:scale-[0.98] cursor-pointer shadow-sm flex items-center justify-center gap-2"
                  >
                    <KeyRound className="size-4" />
                    <span>Join Room</span>
                  </Button>
                </div>
              ) : (
                /* Enter code box revealed ONLY after clicking Join Room */
                <div className="mt-6 space-y-2.5 transition-all duration-300">
                  <Input
                    autoFocus
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        joinRoom();
                      }
                    }}
                    placeholder="ENTER 6-DIGIT CODE"
                    maxLength={12}
                    className="h-11 rounded-xl bg-white/[0.06] border-white/20 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:border-white/40 font-mono tracking-widest text-center text-sm uppercase"
                  />

                  <div className="flex gap-2">
                    <Button
                      onClick={joinRoom}
                      disabled={!connected || !joinInput.trim()}
                      type="button"
                      className="flex-1 h-11 bg-white text-black hover:bg-zinc-200 font-bold text-xs uppercase tracking-wider rounded-xl transition duration-150 active:scale-[0.98] cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span>Connect</span>
                      <ArrowRight className="size-3.5" />
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowJoinInput(false);
                        setJoinInput("");
                      }}
                      type="button"
                      className="h-11 px-3.5 rounded-xl border-white/15 bg-white/[0.05] hover:bg-white/10 text-xs font-medium text-white/60 hover:text-white transition cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* STATE 2: IN A ROOM -> Dedicated Match Lobby Hub */
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0e1017]/95 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

            {/* Header & Status Indicator */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <span className="text-xs font-mono tracking-wider text-white/40 uppercase">
                LOBBY SESSION
              </span>

              {status === "waiting-for-opponent" && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-500/25 bg-amber-500/10 text-amber-300">
                  <LoaderCircle className="size-3 animate-spin" />
                  <span>Waiting for player</span>
                </div>
              )}

              {status === "matched" && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                  <Check className="size-3" />
                  <span>Match Ready</span>
                </div>
              )}

              {status === "opponent-left" && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-rose-500/30 bg-rose-500/10 text-rose-300">
                  <span>Opponent Left</span>
                </div>
              )}
            </div>

            {/* Centerpiece: Room Code Station */}
            <div className="my-6 rounded-xl border border-white/10 bg-white/[0.03] p-5 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
                ROOM CODE
              </span>

              <p className="my-2.5 font-mono text-4xl sm:text-5xl font-black tracking-[0.2em] text-white select-all">
                {code}
              </p>

              <Button
                variant="outline"
                size="sm"
                onClick={copyCode}
                type="button"
                className="h-8 px-3 text-xs border-white/15 bg-white/[0.05] hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="mr-1.5 size-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 size-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </Button>
            </div>

            {/* Player Slots */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="text-[10px] uppercase font-mono text-white/40">
                  Player 01 {isRef ? "(Host)" : ""}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-white">You</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="text-[10px] uppercase font-mono text-white/40">
                  Player 02
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {status === "matched" ? (
                    <>
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      <span className="text-xs font-semibold text-white">
                        Connected
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-xs text-white/50">
                        Waiting...
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2">
              {status === "matched" && (
                <Button
                  onClick={navigateToRoom}
                  type="button"
                  className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-bold text-sm rounded-xl transition duration-150 active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Launch Arena</span>
                  <ArrowRight className="size-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={leaveRoom}
                type="button"
                className="w-full h-10 text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 transition cursor-pointer"
              >
                <DoorOpen className="mr-2 size-4" />
                <span>Leave Room</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
