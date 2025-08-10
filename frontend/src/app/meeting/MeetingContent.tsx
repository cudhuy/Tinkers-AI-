'use client';

import { useState, useEffect } from 'react';
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

interface Agenda {
	id: string;
	title: string;
	datetime: string;
	content: string;
}

export function MeetingContent({
	agendas,
	engagementData,
	meetingsData,
}: {
	agendas: Agenda[];
	engagementData: any[];
	meetingsData: any[];
}) {
	const [selectedAgenda, setSelectedAgenda] = useState<Agenda | null>(null);
	const [noAgenda, setNoAgenda] = useState(false);
	const [meetingStarted, setMeetingStarted] = useState(false);
	const [meetingPaused, setMeetingPaused] = useState(false);
	const [elapsedTime, setElapsedTime] = useState(0);
	const [startTime, setStartTime] = useState<number | null>(null);
	const [pausedAt, setPausedAt] = useState<number | null>(null);

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

	const handleAgendaSelect = (agenda: Agenda) => {
		setSelectedAgenda(agenda);
		setNoAgenda(false);
	};

	const handleNoAgenda = () => {
		setSelectedAgenda(null);
		setNoAgenda(true);
	};

	const startMeeting = () => {
		setMeetingStarted(true);
		setMeetingPaused(false);
		setStartTime(Date.now());
		setPausedAt(null);
	};

	const pauseMeeting = () => {
		setMeetingPaused(true);
		setPausedAt(Date.now());
	};

	const resumeMeeting = () => {
		setMeetingPaused(false);
		setPausedAt(null);
	};

	const endMeeting = () => {
		// Here we would typically save meeting data or redirect
		if (window.confirm('Are you sure you want to end the meeting?')) {
			setMeetingStarted(false);
			setMeetingPaused(false);
			setElapsedTime(0);
			setStartTime(null);
			setPausedAt(null);
			// Return to agenda selection
			setSelectedAgenda(null);
			setNoAgenda(false);
		}
	};

	const renderSuggestion = () => {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Suggestion</CardTitle>
					<CardDescription>
						Follow these tips for an effective meeting
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ul className='space-y-2'>
						<li className='flex items-start gap-2'>
							<Badge variant='outline' className='mt-0.5'>
								1
							</Badge>
							<span>
								Start by clearly stating the meeting's purpose and expected
								outcomes
							</span>
						</li>
						<li className='flex items-start gap-2'>
							<Badge variant='outline' className='mt-0.5'>
								2
							</Badge>
							<span>Encourage equal participation from all attendees</span>
						</li>
						<li className='flex items-start gap-2'>
							<Badge variant='outline' className='mt-0.5'>
								3
							</Badge>
							<span>Keep discussions focused on the agenda items</span>
						</li>
						<li className='flex items-start gap-2'>
							<Badge variant='outline' className='mt-0.5'>
								4
							</Badge>
							<span>Summarize key points and decisions frequently</span>
						</li>
						<li className='flex items-start gap-2'>
							<Badge variant='outline' className='mt-0.5'>
								5
							</Badge>
							<span>End with clear action items and responsibilities</span>
						</li>
					</ul>
				</CardContent>
			</Card>
		);
	};

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
											<p className='text-sm text-gray-500 mt-2'>
												{agenda.content
													.replace(/<[^>]*>/g, '')
													.substring(0, 100)}
												...
											</p>
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					<div className='text-center'>
						<Button
							variant='outline'
							size='lg'
							onClick={handleNoAgenda}
							className='w-full py-8 text-lg'
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

				<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
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
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className='pb-2'>
							<CardTitle>Participants</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='text-3xl font-bold'>5</div>
							<div className='flex items-center gap-2 text-sm mt-2'>
								<Badge variant='outline'>Connected</Badge>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className='pb-2'>
							<CardTitle>Time Elapsed</CardTitle>
						</CardHeader>
						<CardContent>
							<div className='text-3xl font-bold font-mono'>
								{formatTime(elapsedTime)}
							</div>
							<div className='flex items-center gap-2 text-sm mt-2'>
								<Badge
									variant='outline'
									className={
										!meetingStarted
											? 'text-gray-500 border-gray-500'
											: meetingPaused
											? 'text-yellow-500 border-yellow-500'
											: 'text-green-500 border-green-500'
									}
								>
									{!meetingStarted
										? 'Ready'
										: meetingPaused
										? 'Paused'
										: 'Running'}
								</Badge>
							</div>
						</CardContent>
					</Card>
				</div>

				<Separator />

				<div className='grid gap-4 md:grid-cols-3'>
					<div className='md:col-span-2'>{renderSuggestion()}</div>

					<div className='space-y-4'>
						<div className='bg-background overflow-hidden'>
							<div>
								<EngagementChart data={engagementData} />
								<Separator className='my-2' />
								<MeetingsChart data={meetingsData} />
							</div>
						</div>
						{selectedAgenda && (
							<Card>
								<CardHeader>
									<CardTitle>Meeting Agenda</CardTitle>
									<CardDescription>{selectedAgenda.title}</CardDescription>
								</CardHeader>
								<CardContent className='max-h-[200px] overflow-y-auto'>
									<div
										className='prose max-w-none text-sm'
										dangerouslySetInnerHTML={{ __html: selectedAgenda.content }}
									/>
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			</div>
		</main>
	);
}
