"use client";

import { Camera, CameraOff, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type CameraState = "idle" | "requesting" | "active" | "denied" | "error";

export default function RoomPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const [cameraState, setCameraState] = useState<CameraState>("idle");
	const [errorMessage, setErrorMessage] = useState("");
	const [roomId, setRoomId] = useState("");

	useEffect(() => {
		let mounted = true;

		params.then(({ id }) => {
			if (mounted) setRoomId(id);
		});

		return () => {
			mounted = false;
			streamRef.current?.getTracks().forEach((track) => track.stop());
		};
	}, [params]);

	async function enableCamera() {
		if (!navigator.mediaDevices?.getUserMedia) {
			setCameraState("error");
			setErrorMessage("Camera access is not supported by this browser.");
			return;
		}

		setCameraState("requesting");
		setErrorMessage("");

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: false,
				video: { facingMode: { ideal: "environment" } },
			});

			streamRef.current = stream;
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
			}
			setCameraState("active");
		} catch (error) {
			const isDenied = error instanceof DOMException && error.name === "NotAllowedError";
			setCameraState(isDenied ? "denied" : "error");
			setErrorMessage(
				isDenied
					? "Camera access was blocked. Allow it in your browser settings, then try again."
					: "We could not open the camera. Check that it is available and try again.",
			);
		}
	}

	function closeCamera() {
		streamRef.current?.getTracks().forEach((track) => track.stop());
		streamRef.current = null;
		if (videoRef.current) videoRef.current.srcObject = null;
		setCameraState("idle");
	}

	return (
		<main className="min-h-screen bg-zinc-950 px-6 py-10 text-white sm:px-10">
			<div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col">
				<Card className="flex flex-1 border-zinc-800 bg-zinc-900/70 text-white">
					<CardHeader className="border-b border-zinc-800">
						<div className="flex items-center justify-between gap-4">
							<div className="min-w-0">
								<Badge variant="outline" className="border-zinc-700 text-zinc-400">
									AR room
								</Badge>
								<CardTitle className="mt-3 break-all text-2xl text-white sm:text-3xl">
									{roomId || "Loading room..."}
								</CardTitle>
								<CardDescription className="mt-1 text-zinc-500">
									{cameraState === "active" ? "Camera is live" : "Ready to join"}
								</CardDescription>
							</div>
							<Badge
								variant={cameraState === "active" ? "default" : "secondary"}
								className={cameraState === "active" ? "bg-emerald-500 text-emerald-950" : "bg-zinc-800 text-zinc-400"}
							>
								{cameraState === "active" ? <Camera aria-hidden="true" /> : <CameraOff aria-hidden="true" />}
								{cameraState === "active" ? "Live" : "Camera off"}
							</Badge>
						</div>
					</CardHeader>

					<CardContent className="relative flex min-h-[min(62vh,620px)] flex-1 items-center justify-center bg-black p-0">
						<video
							ref={videoRef}
							autoPlay
							playsInline
							muted
							className={`h-full w-full object-cover ${cameraState === "active" ? "block" : "hidden"}`}
							aria-label="Live camera preview"
						/>
						{cameraState !== "active" && (
							<div className="max-w-sm px-6 text-center">
								<div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-zinc-900 ring-1 ring-zinc-800">
									{cameraState === "requesting" ? (
										<LoaderCircle className="size-7 animate-spin text-amber-400" aria-hidden="true" />
									) : (
										<Camera className="size-7 text-amber-400" aria-hidden="true" />
									)}
								</div>
								<h2 className="text-lg font-medium">
									{cameraState === "requesting" ? "Requesting camera access" : "Camera access needed"}
								</h2>
								{errorMessage ? (
									<Alert variant="destructive" className="mt-4 border-red-900/60 bg-red-950/40">
										<AlertDescription>{errorMessage}</AlertDescription>
									</Alert>
								) : (
									<p className="mt-2 text-sm leading-6 text-zinc-400">
										Allow camera access to enter this room and start the AR experience.
									</p>
								)}
							</div>
						)}
					</CardContent>

					<CardFooter className="flex flex-wrap justify-between gap-4 border-zinc-800 bg-zinc-900/70 px-5 py-4 sm:px-6">
						<p className="text-sm text-zinc-500">
							{cameraState === "active" ? "Camera is live" : "Room ID: "}
							{cameraState !== "active" && <span className="font-mono text-zinc-300">{roomId}</span>}
						</p>
						{cameraState === "active" ? (
							<Button type="button" variant="outline" onClick={closeCamera}>
								<CameraOff aria-hidden="true" />
								Close camera
							</Button>
						) : (
							<Button type="button" onClick={enableCamera} disabled={cameraState === "requesting"}>
								<Camera aria-hidden="true" />
								{cameraState === "requesting" ? "Opening camera..." : "Enable camera"}
							</Button>
						)}
					</CardFooter>
				</Card>
			</div>
		</main>
	);
}
