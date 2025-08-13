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
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

interface Attachment {
	name: string;
	content: string;
	type: string;
}

interface Agenda {
	id: string;
	title: string;
	datetime: string;
	content: string;
	preparation_tips?: string[];
	checklist?: string[];
	time_plan?: Array<Record<string, string>>;
	attachments?: Attachment[];
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

	// Add state for conversation tips
	const [conversationTips, setConversationTips] = useState<string[]>([]);

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
	const [isOffTopic, setIsOffTopic] = useState<boolean>(false);
	const [topicSummary, setTopicSummary] = useState<string>('');
	const [relevantAgendaItem, setRelevantAgendaItem] = useState<string | null>(
		null,
	);
	const [topicRecommendation, setTopicRecommendation] = useState<string | null>(
		null,
	);

	// Add after engagement state
	const [checklistChecked, setChecklistChecked] = useState<boolean[]>([]);

	// Add after checklistChecked state
	const confettiFiredRef = useRef(false);

	// Add new state for topic timeline after the topicRecommendation state
	const [topicTimeline, setTopicTimeline] = useState<
		Array<{
			timestamp: string;
			summary: string;
			isOffTopic: boolean;
		}>
	>([]);

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
									attachments: selectedAgenda.attachments || [],
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
						// Determine if checkpoint_fulfilled is an index or name
						if (
							typeof data.checkpoint_fulfilled === 'number' ||
							!isNaN(Number(data.checkpoint_fulfilled))
						) {
							// It's an index, get the actual checklist item by index
							console.log(
								'Checkpoint fulfilled number|index:',
								data.checkpoint_fulfilled,
							);
							const index = Number(data.checkpoint_fulfilled);
							if (
								selectedAgenda?.checklist &&
								index >= 0 &&
								index < selectedAgenda.checklist.length + 1
							) {
								const itemIndex = index - 1;
								setChecklistChecked((prev) => {
									const updated = [...prev];
									updated[itemIndex] = true;
									return updated;
								});
							}
						} else {
							// It's a direct item name
							console.log(
								'Checkpoint fulfilled item name:',
								data.checkpoint_fulfilled,
							);
							if (selectedAgenda?.checklist) {
								const itemIndex = selectedAgenda.checklist.findIndex(
									(item) => item === data.checkpoint_fulfilled,
								);
								if (itemIndex !== -1) {
									setChecklistChecked((prev) => {
										const updated = [...prev];
										updated[itemIndex] = true;
										return updated;
									});
								}
							}
						}
					} else if (data.is_offtopic !== undefined) {
						console.log('Topic status:', data);
						setIsOffTopic(data.is_offtopic);

						// Update with new enhanced topic information
						if (data.topic_summary) {
							setTopicSummary(data.topic_summary);

							// Add to topic timeline when topic changes significantly
							setTopicTimeline((prev) => {
								// Only add new entry if summary is different from the last one
								if (
									prev.length === 0 ||
									prev[prev.length - 1].summary !== data.topic_summary
								) {
									return [
										...prev,
										{
											timestamp: new Date().toISOString(),
											summary: data.topic_summary,
											isOffTopic: data.is_offtopic,
										},
									].slice(-10); // Keep last 10 topic changes
								}
								return prev;
							});
						}

						if (data.relevant_agenda_item !== undefined) {
							setRelevantAgendaItem(data.relevant_agenda_item);
						}

						if (data.recommendation !== undefined) {
							setTopicRecommendation(data.recommendation);
						}

						if (data.is_offtopic) {
							// Show toast warning for off-topic conversation
							toast.warning('Off-topic conversation detected', {
								description:
									data.topic_summary ||
									'The conversation is moving away from the agenda items.',
								duration: 5000,
								position: 'bottom-right',
							});
						} else if (isOffTopic) {
							// If previously off-topic but now back on topic
							toast.success('Back on topic', {
								description:
									'The conversation has returned to the agenda items.',
								duration: 3000,
								position: 'bottom-right',
							});
						}
					} else if (data.new_conversation_tip) {
						console.log('New conversation tip:', data.new_conversation_tip);
						setConversationTips((prev) => [...prev, data.new_conversation_tip]);

						// Show toast for new conversation tip
						toast.info('New conversation tip', {
							description: data.new_conversation_tip,
							duration: 5000,
							position: 'bottom-right',
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
				<div className='flex justify-end gap-2 items-center'>
					{/* Status and Timer Inline with Buttons */}
					<div className='flex items-center mr-auto gap-4'>
						<div className='flex items-center gap-2'>
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
							{isRecording && <Badge className='bg-red-500'>Recording</Badge>}
						</div>
						<div className='font-mono font-bold'>{formatTime(elapsedTime)}</div>
					</div>

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
						<div className='grid gap-4'>
							{/* Checklist Card */}
							<Card>
								<CardHeader className='pb-2 flex flex-row items-center justify-between'>
									<CardTitle>Checklist</CardTitle>
									<div className='flex items-center gap-2'>
										<span className='text-sm font-medium'>
											{checklistChecked.filter(Boolean).length}/
											{checklistChecked.length}
										</span>
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
												? 'Complete'
												: `${
														checklistChecked.length === 0
															? 0
															: Math.round(
																	(checklistChecked.filter(Boolean).length /
																		checklistChecked.length) *
																		100,
															  )
												  }%`}
										</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<ul className='space-y-2'>
										{(selectedAgenda?.checklist || []).map(
											(item: string, index: number) => (
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
											),
										)}
									</ul>
								</CardContent>
							</Card>

							{/* Conversation Tips and User Engagement Cards Side by Side */}
							<div className='grid grid-cols-2 gap-4'>
								{/* Conversation Tips Card */}
								<Card>
									<CardHeader className='pb-0'>
										<CardTitle className='text-sm font-medium'>
											Conversation Tips
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className='max-h-[150px] overflow-y-auto'>
											{conversationTips.length > 0 ? (
												<div className='space-y-3'>
													{conversationTips.map((tip, index) => (
														<div
															key={index}
															className='rounded-md bg-blue-50 p-3 text-sm border-l-4 border-blue-400'
														>
															<div className='text-blue-700'>{tip}</div>
														</div>
													))}
												</div>
											) : (
												<div className='rounded-md bg-gray-50 p-3 text-sm'>
													<div className='text-gray-700'>
														{meetingStarted
															? 'Helpful conversation tips will appear here as the meeting progresses.'
															: 'Start the meeting to receive tailored conversation tips.'}
													</div>
												</div>
											)}
										</div>
									</CardContent>
								</Card>

								{/* User Engagement Card */}
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
							</div>

							{/* Topic Relevance Card */}
							<Card>
								<CardHeader className='pb-0'>
									<CardTitle className='text-sm font-medium'>
										Topic Relevance
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className='flex flex-col gap-3'>
										<div className='flex items-center justify-between'>
											<span>Status:</span>
											<Badge
												className={isOffTopic ? 'bg-red-500' : 'bg-green-500'}
											>
												{isOffTopic ? 'Off Topic' : 'On Topic'}
											</Badge>
										</div>

										{/* Topic Summary Section */}
										<div className='border-b pb-2'>
											<div className='font-semibold text-sm mb-1'>
												Current Topic:
											</div>
											<div className='text-sm'>
												{topicSummary ||
													(meetingStarted
														? 'Analyzing conversation...'
														: 'Start the meeting to track topics.')}
											</div>
										</div>

										{/* Relevant Agenda Item Section */}
										{!isOffTopic && relevantAgendaItem && (
											<div className='border-b pb-2'>
												<div className='font-semibold text-sm mb-1'>
													Related to:
												</div>
												<div className='text-sm flex items-center gap-1'>
													<span className='bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium'>
														{relevantAgendaItem}
													</span>
												</div>
											</div>
										)}

										{/* Recommendation Section */}
										{topicRecommendation && (
											<div className='pt-1'>
												<div className='font-semibold text-sm mb-1'>
													Suggestion:
												</div>
												<div className='text-sm italic text-gray-600'>
													"{topicRecommendation}"
												</div>
											</div>
										)}

										{isOffTopic && (
											<div className='rounded-md bg-red-50 p-3 text-sm mt-1'>
												<div className='font-semibold text-red-800 mb-1'>
													Off-topic detected:
												</div>
												<div className='text-red-700'>{topicSummary}</div>
												{topicRecommendation && (
													<div className='mt-2 text-red-600 italic border-t border-red-200 pt-1'>
														Tip: {topicRecommendation}
													</div>
												)}
											</div>
										)}

										{!isOffTopic && meetingStarted && topicSummary && (
											<div className='rounded-md bg-green-50 p-3 text-sm mt-1'>
												<div className='font-semibold text-green-800 mb-1'>
													On topic:
												</div>
												<div className='text-green-700'>{topicSummary}</div>
											</div>
										)}

										{!meetingStarted && (
											<div className='rounded-md bg-gray-50 p-3 text-sm'>
												<div className='text-gray-700'>
													Start the meeting to track topic relevance.
												</div>
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						</div>
					</div>

					<div className='md:col-span-1 space-y-4'>
						{/* Time Plan Card */}
						<Card>
							<CardHeader>
								<CardTitle className='text-sm font-medium'>Time Plan</CardTitle>
								<CardDescription className='text-xs'>
									Timeline for the meeting
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='space-y-3 font-semibold'>
									{(selectedAgenda?.time_plan || []).map((item, index) => {
										const timeSlot = Object.keys(item)[0];
										const activity = item[timeSlot];

										// Parse timeSlot format (startingTime - endTime) where each time is in minutes:seconds
										const [startStr, endStr] = timeSlot
											.split('-')
											.map((t) => t.trim());

										// Convert start and end times to seconds
										const toSeconds = (timeStr: string) => {
											const [minutes, seconds] = timeStr.split(':').map(Number);
											return minutes * 60 + seconds;
										};

										const startSeconds = toSeconds(startStr);
										const endSeconds = toSeconds(endStr);

										// Check if current elapsed time falls within this time slot
										const isCurrentActivity =
											elapsedTime >= startSeconds && elapsedTime < endSeconds;

										// Check if this activity is in the past (completed)
										const isPastActivity = elapsedTime >= endSeconds;

										return (
											<div
												key={index}
												className={`border-l-2 pl-3 ${
													isCurrentActivity
														? 'border-green-500'
														: isPastActivity
														? 'border-gray-400'
														: 'border-gray-300'
												}`}
											>
												<div className='text-sm font-medium text-gray-500'>
													{timeSlot}
												</div>
												<div
													className={`mt-0.5 text-sm ${
														isCurrentActivity
															? 'font-bold text-green-600'
															: isPastActivity
															? 'text-gray-500'
															: ''
													}`}
												>
													{activity}
												</div>
											</div>
										);
									})}
								</div>
							</CardContent>
						</Card>

						{/* Topic Timeline Card - Moved to right column */}
						{meetingStarted && topicTimeline.length > 0 && (
							<Card>
								<CardHeader className='pb-0'>
									<CardTitle className='text-sm font-medium'>
										Topic Timeline
									</CardTitle>
									<CardDescription className='text-xs'>
										Topic transitions during the meeting
									</CardDescription>
								</CardHeader>
								<CardContent className='pt-2'>
									<div className='space-y-2 max-h-[200px] overflow-y-auto pr-1'>
										{topicTimeline.map((item, index) => (
											<div
												key={index}
												className='flex gap-2 items-start text-sm'
											>
												<div className='text-gray-500 min-w-[60px]'>
													{new Date(item.timestamp).toLocaleTimeString([], {
														hour: '2-digit',
														minute: '2-digit',
													})}
												</div>
												<div
													className={`flex-1 p-2 rounded-md text-xs ${
														item.isOffTopic
															? 'bg-red-50 text-red-700'
															: 'bg-green-50 text-green-700'
													}`}
												>
													<span
														className={`inline-block px-1.5 py-0.5 text-xs rounded mr-1.5 ${
															item.isOffTopic
																? 'bg-red-200 text-red-800'
																: 'bg-green-200 text-green-800'
														}`}
													>
														{item.isOffTopic ? 'Off Topic' : 'On Topic'}
													</span>
													{item.summary}
												</div>
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			</div>
		</main>
	);
}
