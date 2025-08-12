'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { EngagementChart } from '@/components/charts/EngagementChart';
import { MeetingsChart } from '@/components/charts/MeetingsChart';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';

interface Agenda {
	id: string;
	title: string;
	datetime: string;
	content: string;
	preparation_tips?: string[];
	checklist?: string[];
	time_plan?: Array<Record<string, string>>;
}

export function MeetingContent({
	agendas = [],
	initialEngagementData = { users: [], participation: [] },
	meetingsData = { months: [], counts: [] },
}: {
	agendas?: Agenda[];
	initialEngagementData?: any;
	meetingsData?: any;
}) {
	const router = useRouter();
	const [selectedAgenda, setSelectedAgenda] = useState<Agenda | null>(null);
	const [noAgenda, setNoAgenda] = useState(false);
	const [meetingStarted, setMeetingStarted] = useState(false);
	const [meetingPaused, setMeetingPaused] = useState(false);
	const [elapsedTime, setElapsedTime] = useState(0);
	const [startTime, setStartTime] = useState<number | null>(null);
	const [pausedAt, setPausedAt] = useState<number | null>(null);
	// For demonstration, we'll set random values for these
	const [participants, setParticipants] = useState<number>(
		Math.floor(Math.random() * 10) + 5,
	); // 5-15 participants
	const [engagement, setEngagement] = useState<number>(
		Math.floor(Math.random() * 30) + 70,
	); // 70-100% engagement

	// Add state for tracking word counts
	const [hostWords, setHostWords] = useState<number>(0);
	const [guestWords, setGuestWords] = useState<number>(0);
	const [engagementData, setEngagementData] = useState<
		{ date: string; engagement: number }[]
	>([{ date: new Date().toISOString(), engagement: 0 }]);

	// Audio recording states
	const [isRecording, setIsRecording] = useState(false);
	const [transcripts, setTranscripts] = useState<string[]>([]);
	const socketRef = useRef<WebSocket | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const audioBufferRef = useRef<AudioBuffer | null>(null);
	const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const audioPlaybackPositionRef = useRef<number>(0);

	// Add after engagement state
	const [checklistChecked, setChecklistChecked] = useState<boolean[]>([]);

	// Add after checklistChecked state
	const confettiFiredRef = useRef(false);

	// Format seconds to hh:mm:ss
	const formatTime = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;
		return [
			hours.toString().padStart(2, '0'),
			minutes.toString().padStart(2, '0'),
			secs.toString().padStart(2, '0'),
		].join(':');
	};

	// Timer effect
	useEffect(() => {
		let interval: NodeJS.Timeout | null = null;

		if (meetingStarted && !meetingPaused) {
			interval = setInterval(() => {
				setElapsedTime((prevTime) => prevTime + 1);
			}, 1000);
		}

		return () => {
			if (interval) clearInterval(interval);
		};
	}, [meetingStarted, meetingPaused]);

	// Audio recording effect
	useEffect(() => {
		// Listen for engagement updates from the ChatBot component
		const handleEngagementUpdate = (event: CustomEvent) => {
			if (event.detail && event.detail.words_count && event.detail.user_type) {
				console.log('Received engagement update:', event.detail);

				// Update word counts based on user type
				if (event.detail.user_type === 'host') {
					setHostWords((prevCount) => prevCount + event.detail.words_count);
				} else if (event.detail.user_type === 'guest') {
					setGuestWords((prevCount) => prevCount + event.detail.words_count);
				}

				// Calculate and update engagement percentage
				setTimeout(() => {
					setHostWords((prevHostWords) => {
						setGuestWords((prevGuestWords) => {
							const totalWords = prevHostWords + prevGuestWords;
							if (totalWords > 0) {
								// Calculate guest engagement percentage (what we want to track)
								const guestPercentage = Math.round(
									(prevGuestWords / totalWords) * 100,
								);

								// Update engagement chart data with current timestamp and percentage
								setEngagementData((prevData) => {
									// Get current time for the data point
									const now = new Date().toISOString();

									// Create new data point
									const newDataPoint = {
										date: now,
										engagement: guestPercentage,
									};

									// If data array is empty, initialize with this point
									if (prevData.length === 0) {
										return [newDataPoint];
									}

									// If the latest point was added less than 2 seconds ago, replace it
									// instead of adding a new point - reduces visual jumpiness
									const latestPoint = prevData[prevData.length - 1];
									const timeDiff =
										new Date(now).getTime() -
										new Date(latestPoint.date).getTime();

									if (timeDiff < 2000) {
										// Replace latest point
										return [...prevData.slice(0, -1), newDataPoint];
									} else {
										// Add new point and limit array to last 14 data points
										const updatedData = [...prevData, newDataPoint];
										return updatedData.slice(-14);
									}
								});

								// Also update the main engagement metric
								setEngagement(guestPercentage);
							}
							return prevGuestWords;
						});
						return prevHostWords;
					});
				}, 0);
			}
		};

		// Add event listener for custom engagementUpdate events
		window.addEventListener(
			'engagementUpdate',
			handleEngagementUpdate as EventListener,
		);

		// Clean up function for audio resources
		return () => {
			window.removeEventListener(
				'engagementUpdate',
				handleEngagementUpdate as EventListener,
			);

			if (
				socketRef.current &&
				socketRef.current.readyState === WebSocket.OPEN
			) {
				socketRef.current.close();
			}

			// Stop the interval timer if it's running
			if (audioIntervalRef.current) {
				clearInterval(audioIntervalRef.current);
				audioIntervalRef.current = null;
			}

			// Close AudioContext if it exists
			if (audioContextRef.current) {
				audioContextRef.current.close();
				audioContextRef.current = null;
			}
		};
	}, []);

	// Function to start audio recording
	const startRecording = async () => {
		try {
			// Connect to WebSocket
			socketRef.current = new WebSocket(
				'ws://localhost:8000/api/conversation/transcribe',
			);

			socketRef.current.onopen = async () => {
				console.log('WebSocket connection established');

				// Send agenda information to the backend when connection is established
				if (
					socketRef.current &&
					socketRef.current.readyState === WebSocket.OPEN
				) {
					const agendaInfo = {
						type: 'agenda_info',
						agenda: selectedAgenda
							? {
									id: selectedAgenda.id,
									title: selectedAgenda.title,
									datetime: selectedAgenda.datetime,
									content: selectedAgenda.content,
									preparation_tips: selectedAgenda.preparation_tips || [],
									checklist_items: selectedAgenda.checklist || [],
									time_plan: selectedAgenda.time_plan || [],
							  }
							: {
									id: 'no_agenda',
									title: 'Meeting without Agenda',
									datetime: new Date().toISOString(),
									content: 'Impromptu meeting with no predefined agenda',
									preparation_tips: [],
									checklist_items: [],
									time_plan: [],
							  },
					};

					// Send as text message for the backend to process
					socketRef.current.send(JSON.stringify(agendaInfo));
				}

				// --- Start: WAV File Loading ---
				try {
					// Use a path relative to the public directory
					const wavFilePath =
						'/data/coral_gpt-4o-mini-tts_1x_2025-04-26T00_50_33-792Z.wav';
					console.log(`Fetching WAV file from: ${wavFilePath}`);
					const response = await fetch(wavFilePath);
					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}
					const arrayBuffer = await response.arrayBuffer();

					console.log('Decoding audio data...');
					// Create AudioContext only if it doesn't exist or is closed
					if (
						!audioContextRef.current ||
						audioContextRef.current.state === 'closed'
					) {
						// Ensure the sample rate matches the backend expectation (e.g., 24000 Hz)
						audioContextRef.current = new AudioContext({ sampleRate: 24000 });
					}

					// Decode the audio data using the AudioContext's sample rate
					audioBufferRef.current =
						await audioContextRef.current.decodeAudioData(arrayBuffer);
					console.log('Audio data decoded successfully.');
					audioPlaybackPositionRef.current = 0; // Reset playback position

					// --- Start sending audio chunks ---
					const chunkSize = 1024; // Send chunks of this size
					const sampleRate = audioContextRef.current.sampleRate;
					// Interval duration based on chunk size and sample rate (e.g., 1024 samples / 24000 Hz)
					const intervalDuration = (chunkSize / sampleRate) * 1000;

					if (audioIntervalRef.current) clearInterval(audioIntervalRef.current); // Clear previous interval if any

					audioIntervalRef.current = setInterval(() => {
						if (meetingPaused) return; // Don't send data if paused

						if (
							!audioBufferRef.current ||
							!socketRef.current ||
							socketRef.current.readyState !== WebSocket.OPEN
						) {
							if (audioIntervalRef.current)
								clearInterval(audioIntervalRef.current);
							return;
						}

						const audioData = audioBufferRef.current.getChannelData(0); // Assuming mono audio
						const start = audioPlaybackPositionRef.current;
						const end = Math.min(start + chunkSize, audioData.length);

						if (start >= audioData.length) {
							console.log('Finished sending audio file.');
							if (audioIntervalRef.current)
								clearInterval(audioIntervalRef.current);
							// Optionally close WebSocket or indicate completion
							// socketRef.current?.close(); // Uncomment if you want to close WS when file ends
							return;
						}

						const chunk = audioData.slice(start, end);

						// Convert Float32 chunk to Int16 PCM
						const pcmData = new Int16Array(chunk.length);
						for (let i = 0; i < chunk.length; i++) {
							pcmData[i] = Math.max(-1, Math.min(1, chunk[i])) * 0x7fff;
						}

						// Send binary data
						socketRef.current.send(pcmData.buffer);

						audioPlaybackPositionRef.current = end; // Update playback position
					}, intervalDuration); // Send chunks at intervals corresponding to audio duration

					setIsRecording(true);
				} catch (fetchError) {
					console.error('Error fetching or processing WAV file:', fetchError);
					// Close WebSocket if file loading fails
					socketRef.current?.close();
					setIsRecording(false);
				}
				// --- End: WAV File Loading ---
			};

			socketRef.current.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					if (data.text) {
						console.log('Transcription received:', data.text);
						setTranscripts((prev) => [...prev, data.text]);
					} else if (data.words_count && data.user_type) {
						// Process word count data from WebSocket
						console.log(
							'Engagement data received:',
							data.words_count,
							data.user_type,
						);

						// Update word counts based on user type
						if (data.user_type === 'host') {
							setHostWords((prevCount) => prevCount + data.words_count);
						} else if (data.user_type === 'guest') {
							setGuestWords((prevCount) => prevCount + data.words_count);
						}

						// Calculate and update engagement percentage
						setTimeout(() => {
							setHostWords((prevHostWords) => {
								setGuestWords((prevGuestWords) => {
									const totalWords = prevHostWords + prevGuestWords;
									if (totalWords > 0) {
										// Calculate guest engagement percentage (what we want to track)
										const guestPercentage = Math.round(
											(prevGuestWords / totalWords) * 100,
										);

										// Update engagement chart data with current timestamp and percentage
										setEngagementData((prevData) => {
											// Get current time for the data point
											const now = new Date().toISOString();

											// Create new data point
											const newDataPoint = {
												date: now,
												engagement: guestPercentage,
											};

											// If data array is empty, initialize with this point
											if (prevData.length === 0) {
												return [newDataPoint];
											}

											// If the latest point was added less than 2 seconds ago, replace it
											// instead of adding a new point - reduces visual jumpiness
											const latestPoint = prevData[prevData.length - 1];
											const timeDiff =
												new Date(now).getTime() -
												new Date(latestPoint.date).getTime();

											if (timeDiff < 2000) {
												// Replace latest point
												return [...prevData.slice(0, -1), newDataPoint];
											} else {
												// Add new point and limit array to last 14 data points
												const updatedData = [...prevData, newDataPoint];
												return updatedData.slice(-14);
											}
										});

										// Also update the main engagement metric
										setEngagement(guestPercentage);
									}
									return prevGuestWords;
								});
								return prevHostWords;
							});
						}, 0);
					} else if (data.checkpoint_fulfilled !== undefined) {
						console.log('Checkpoint fulfilled:', data.checkpoint_fulfilled);
						// checkpoint_fulfilled can be index or item name
						setChecklistChecked((prev) => {
							// If it's an index
							if (typeof data.checkpoint_fulfilled === 'number') {
								return prev.map((checked, idx) =>
									idx === data.checkpoint_fulfilled - 1 ? true : checked,
								);
							}
							// If it's a string (item name)
							if (
								typeof data.checkpoint_fulfilled === 'string' &&
								selectedAgenda &&
								selectedAgenda.checklist
							) {
								return prev.map((checked, idx) =>
									selectedAgenda.checklist &&
									selectedAgenda.checklist[idx] === data.checkpoint_fulfilled
										? true
										: checked,
								);
							}
							return prev;
						});
					} else if (data.error) {
						console.error('Error from server:', data.error);
					} else if (data.status) {
						console.log('Status:', data.status);
					}
				} catch (error) {
					console.log('Raw message:', event.data);
				}
			};

			socketRef.current.onerror = (error) => {
				console.error('WebSocket error:', error);
				if (audioIntervalRef.current) clearInterval(audioIntervalRef.current); // Clean up interval on error
				setIsRecording(false);
			};

			socketRef.current.onclose = (event) => {
				console.log('WebSocket connection closed:', event.code, event.reason);
				if (audioIntervalRef.current) clearInterval(audioIntervalRef.current); // Clean up interval on close
				setIsRecording(false);
				audioPlaybackPositionRef.current = 0; // Reset position
			};

			// Microphone access and processing code removed
			// const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			// ... processor setup and onaudioprocess removed ...
		} catch (error) {
			console.error('Error setting up WebSocket or audio:', error);
			setIsRecording(false); // Ensure recording state is false on error
		}
	};

	// Function to stop audio recording
	const stopRecording = () => {
		// Stop sending data by clearing the interval
		if (audioIntervalRef.current) {
			clearInterval(audioIntervalRef.current);
			audioIntervalRef.current = null;
		}

		// Close the WebSocket connection
		if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
			socketRef.current.close(); // This will trigger the onclose handler which also clears the interval
		} else {
			// If WS is already closed or closing, ensure state is updated
			setIsRecording(false);
		}

		// Reset audio buffer and position refs
		audioBufferRef.current = null;
		audioPlaybackPositionRef.current = 0;

		// Close AudioContext (optional, could keep it for reuse)
		// if (audioContextRef.current) {
		//   audioContextRef.current.close();
		//   audioContextRef.current = null;
		// }

		// No stream to stop anymore
		// if (streamRef.current) { ... }
	};

	const handleAgendaSelect = (agenda: Agenda) => {
		setSelectedAgenda(agenda);
		setNoAgenda(false);
		// If agenda has preparation_tips, count that as the total items
		if (agenda.preparation_tips && agenda.preparation_tips.length > 0) {
			// setTotalItems(agenda.preparation_tips.length);
		}
		// Initialize checklist checked state
		setChecklistChecked((agenda.checklist || []).map(() => false));
	};

	const handleNoAgenda = () => {
		setSelectedAgenda(null);
		setNoAgenda(true);
		setChecklistChecked([]);
	};

	const startMeeting = () => {
		console.log('Starting meeting');
		console.log(selectedAgenda);
		setMeetingStarted(true);
		setMeetingPaused(false);
		setStartTime(Date.now());
		setPausedAt(null);
		// Start audio recording when meeting starts
		startRecording();
		// Defensive: re-init checklistChecked if needed
		if (selectedAgenda && selectedAgenda.checklist) {
			setChecklistChecked(selectedAgenda.checklist.map(() => false));
		}
	};

	const pauseMeeting = () => {
		setMeetingPaused(true);
		setPausedAt(Date.now());
		// When meeting is paused, audio recording continues but data isn't sent
		// The onaudioprocess handler checks meetingPaused state
	};

	const resumeMeeting = () => {
		setMeetingPaused(false);
		setPausedAt(null);
		// Resume sending audio data
	};

	const saveMeetingData = async () => {
		const timestamp = Math.floor(Date.now() / 1000); // Current timestamp in seconds

		const meetingData = {
			id: timestamp.toString(),
			title: selectedAgenda ? selectedAgenda.title : 'Untitled Meeting',
			date: new Date().toISOString(),
			duration: formatTime(elapsedTime),
			engagement,
			participants,
			transcripts,
			completedItems: checklistChecked.filter(Boolean).length,
			totalItems: checklistChecked.length,
			checklistChecked: checklistChecked,
			checklist: selectedAgenda?.checklist || [],
		};

		try {
			// In a real app, this would be an API call to the server
			// For this demo, we're using the browser's localStorage
			// This is just for demonstration as localStorage won't be shared with the server-side rendering
			localStorage.setItem(`meeting_${timestamp}`, JSON.stringify(meetingData));

			// In a real application, you would use an API endpoint to save this data
			const response = await fetch('/api/meetings', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					timestamp,
					data: meetingData,
				}),
			});

			if (!response.ok) {
				console.error('Failed to save meeting data');
			}

			return timestamp;
		} catch (error) {
			console.error('Error saving meeting data:', error);
			return timestamp; // Still return timestamp for redirect even if save fails
		}
	};

	const endMeeting = async () => {
		if (window.confirm('Are you sure you want to end the meeting?')) {
			// Stop recording
			stopRecording();

			// Save meeting data
			const timestamp = await saveMeetingData();

			// Reset meeting state
			setMeetingStarted(false);
			setMeetingPaused(false);
			setElapsedTime(0);
			setStartTime(null);
			setPausedAt(null);

			// Redirect to the home page after a short delay
			setTimeout(() => {
				router.push('/');
			}, 500);
		}
	};

	const renderSuggestion = () => {
		// Use checklist items from selected agenda, or default items if not available
		const checklistItems = selectedAgenda?.checklist || [];

		return (
			<Card>
				<CardHeader>
					<CardTitle>Checklist</CardTitle>
					<CardDescription>
						Track your progress during the meeting
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ul className='space-y-2'>
						{checklistItems.map((item: string, index: number) => (
							<li key={index} className='flex items-start gap-2'>
								<input
									type='checkbox'
									id={`checklist-item-${index}`}
									className='h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer mt-1'
									checked={!!checklistChecked[index]}
									onChange={() => {
										setChecklistChecked((prev) => {
											const updated = [...prev];
											updated[index] = !updated[index];
											return updated;
										});
									}}
								/>
								<label
									htmlFor={`checklist-item-${index}`}
									className={`text-sm cursor-pointer ${
										checklistChecked[index]
											? 'text-gray-400 line-through'
											: 'text-gray-700'
									}`}
								>
									{item}
								</label>
							</li>
						))}
					</ul>
				</CardContent>
			</Card>
		);
	};

	// Add after checklistChecked state
	useEffect(() => {
		const allChecked =
			checklistChecked.length > 0 && checklistChecked.every(Boolean);
		if (allChecked && !confettiFiredRef.current) {
			confettiFiredRef.current = true;
			confetti({
				particleCount: 80,
				spread: 70,
				origin: { y: 0.6 },
			});
		} else if (!allChecked) {
			confettiFiredRef.current = false;
		}
	}, [checklistChecked]);

	// Render the meeting selection screen
	if (!selectedAgenda && !noAgenda) {
		return (
			<main className='flex-1 p-4 md:p-6'>
				<div className='max-w-4xl mx-auto'>
					<h1 className='text-2xl font-bold mb-6'>
						Select an Agenda for Your Meeting
					</h1>

					<div className='mb-6'>
						{agendas.length === 0 ? (
							<p className='text-center py-4 border rounded-lg'>
								No agendas available. You can continue without an agenda.
							</p>
						) : (
							<div className='max-h-[60vh] overflow-y-auto border rounded-lg pr-2'>
								<div className='space-y-4 p-4'>
									{agendas.map((agenda) => (
										<div
											key={agenda.id}
											className='border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer'
											onClick={() => handleAgendaSelect(agenda)}
										>
											<div className='flex justify-between items-start'>
												<h3 className='font-medium'>{agenda.title}</h3>
												<Badge variant='outline'>
													{new Date(agenda.datetime).toLocaleDateString()}
												</Badge>
											</div>
											{agenda.preparation_tips &&
												agenda.preparation_tips.length > 0 && (
													<div className='mt-2'>
														<p className='text-sm text-gray-700 font-medium mb-1'>
															Preparation tips:
														</p>
														<ul className='text-xs text-gray-500 pl-4 list-disc'>
															{agenda.preparation_tips
																.slice(0, 3)
																.map((tip: string, index: number) => (
																	<li key={index}>{tip}</li>
																))}
														</ul>
													</div>
												)}
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					<div className='text-center'>
						<Button
							className='w-full py-8 text-lg bg-black text-white hover:bg-black/90'
							onClick={handleNoAgenda}
						>
							Continue Without Agenda
						</Button>
					</div>
				</div>
			</main>
		);
	}

	// Render the meeting dashboard
	return (
		<main className='flex-1 p-4 md:p-6'>
			<div className='space-y-6'>
				{/* Meeting control buttons */}
				<div className='flex justify-end gap-2'>
					{!meetingStarted ? (
						<Button
							onClick={startMeeting}
							className='bg-green-600 hover:bg-green-700'
						>
							Start Meeting
						</Button>
					) : (
						<>
							{meetingPaused ? (
								<Button
									onClick={resumeMeeting}
									className='bg-green-600 hover:bg-green-700'
								>
									Resume Meeting
								</Button>
							) : (
								<Button
									onClick={pauseMeeting}
									variant='outline'
									className='border-yellow-500 text-yellow-500 hover:bg-yellow-50'
								>
									Pause Meeting
								</Button>
							)}
							<Button
								onClick={endMeeting}
								variant='outline'
								className='border-red-500 text-red-500 hover:bg-red-50'
							>
								End Meeting
							</Button>
						</>
					)}
				</div>

				<div className='grid gap-4 md:grid-cols-3'>
					<div className='md:col-span-2'>
						<div className='grid gap-4 md:grid-cols-3'>
							<Card>
								<CardHeader className='pb-2'>
									<CardTitle>Meeting Status</CardTitle>
								</CardHeader>
								<CardContent>
									<div className='text-3xl font-bold'>
										{!meetingStarted
											? 'Not Started'
											: meetingPaused
											? 'Paused'
											: 'Active'}
									</div>
									<div className='flex items-center gap-2 text-sm mt-2'>
										<Badge
											className={
												!meetingStarted
													? 'bg-gray-500'
													: meetingPaused
													? 'bg-yellow-500'
													: 'bg-green-500'
											}
										>
											{!meetingStarted
												? 'Ready'
												: meetingPaused
												? 'Paused'
												: 'In Progress'}
										</Badge>
										{isRecording && (
											<Badge className='bg-red-500'>Recording</Badge>
										)}
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='pb-2'>
									<CardTitle>Elapsed Time</CardTitle>
								</CardHeader>
								<CardContent>
									<div className='text-3xl font-bold'>
										{formatTime(elapsedTime)}
									</div>
									<div className='flex items-center gap-2 text-sm mt-2'>
										<Badge variant='outline'>
											{startTime
												? `Started at ${new Date(
														startTime,
												  ).toLocaleTimeString()}`
												: 'Not started yet'}
										</Badge>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className='pb-2'>
									<CardTitle>Progress</CardTitle>
								</CardHeader>
								<CardContent>
									{/* Progress now counts checked checklist items */}
									<div className='text-3xl font-bold'>
										{checklistChecked.filter(Boolean).length}/
										{checklistChecked.length}
									</div>
									<div className='flex items-center gap-2 text-sm mt-2'>
										<Badge
											variant='outline'
											className={
												checklistChecked.length > 0 &&
												checklistChecked.every(Boolean)
													? 'text-green-500 border-green-500'
													: ''
											}
										>
											{checklistChecked.length > 0 &&
											checklistChecked.every(Boolean)
												? 'All items completed'
												: `${
														checklistChecked.length === 0
															? 0
															: Math.round(
																	(checklistChecked.filter(Boolean).length /
																		checklistChecked.length) *
																		100,
															  )
												  }% complete`}
										</Badge>
									</div>
								</CardContent>
							</Card>
						</div>

						<div className='mt-4 grid gap-4'>
							{renderSuggestion()}

							<Card>
								<CardHeader>
									<CardTitle>Time Plan</CardTitle>
									<CardDescription>Timeline for the meeting</CardDescription>
								</CardHeader>
								<CardContent>
									<div className='space-y-3'>
										{(selectedAgenda?.time_plan || []).map((item, index) => {
											const timeSlot = Object.keys(item)[0];
											const activity = item[timeSlot];
											return (
												<div
													key={index}
													className='border-l-2 border-gray-300 pl-3'
												>
													<div className='text-sm font-medium text-gray-500'>
														{timeSlot}
													</div>
													<div className='mt-0.5'>{activity}</div>
												</div>
											);
										})}
									</div>
								</CardContent>
							</Card>
						</div>
					</div>

					<div className='space-y-4'>
						<Card>
							<CardHeader className='pb-0'>
								<CardTitle className='text-sm font-medium'>
									User Engagement
								</CardTitle>
							</CardHeader>
							<CardContent>
								<EngagementChart data={engagementData} />
							</CardContent>
						</Card>
						<Card>
							<CardHeader className='pb-0'>
								<CardTitle className='text-sm font-medium'>
									Monthly Meetings
								</CardTitle>
							</CardHeader>
							<CardContent>
								<MeetingsChart data={meetingsData} />
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</main>
	);
}
