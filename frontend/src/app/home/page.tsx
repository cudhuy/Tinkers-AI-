import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { EngagementChart } from '@/components/charts/EngagementChart';
import { MeetingsChart } from '@/components/charts/MeetingsChart';
import path from 'path';
import fs from 'fs';
import { Play, CalendarPlus } from 'lucide-react';

// Helper function to extract first sentence and strip HTML
function extractFirstSentence(htmlContent: string): string {
	// Remove HTML tags
	const plainText = htmlContent.replace(/<[^>]*>/g, '');

	// Find the first sentence (ending with ., ! or ?)
	const sentenceMatch = plainText.match(/^.*?[.!?](?:\s|$)/);

	if (sentenceMatch && sentenceMatch[0]) {
		return sentenceMatch[0].trim();
	}

	// If no sentence ending found, return first 100 chars or the entire text if shorter
	return plainText.length > 100
		? plainText.substring(0, 100) + '...'
		: plainText;
}

// Get all agendas from individual files
async function getAgendas() {
	const agendaDir = path.join(process.cwd(), 'src/data/mocked/agendas');
	const agendaFiles = fs
		.readdirSync(agendaDir)
		.filter((file) => /^\d+\.json$/.test(file)); // Only get numbered JSON files

	const agendas = await Promise.all(
		agendaFiles.map(async (file) => {
			const content = await fs.promises.readFile(
				path.join(agendaDir, file),
				'utf8',
			);
			return JSON.parse(content);
		}),
	);

	return agendas;
}

// Get all previous meetings from timestamp files
async function getPreviousMeetings() {
	const meetingsDir = path.join(process.cwd(), 'src/data/mocked/meetings');

	// Check if directory exists
	try {
		fs.accessSync(meetingsDir);
	} catch (error) {
		console.warn('Meetings directory not found:', meetingsDir);
		return [];
	}

	const meetingFiles = fs
		.readdirSync(meetingsDir)
		.filter((file) => /^\d+\.json$/.test(file)); // Only get timestamp JSON files

	const meetings = await Promise.all(
		meetingFiles.map(async (file) => {
			const content = await fs.promises.readFile(
				path.join(meetingsDir, file),
				'utf8',
			);
			const meeting = JSON.parse(content);
			// Add the timestamp (filename without extension) to the meeting object
			meeting.timestamp = parseInt(file.replace('.json', ''));
			return meeting;
		}),
	);

	return meetings;
}

async function getEngagementData() {
	const dataPath = path.join(
		process.cwd(),
		'src/data/mocked/stats/user-engagement.json',
	);
	const content = await fs.promises.readFile(dataPath, 'utf8');
	return JSON.parse(content);
}

async function getMeetingsData() {
	const dataPath = path.join(
		process.cwd(),
		'src/data/mocked/stats/monthly-meetings.json',
	);
	const content = await fs.promises.readFile(dataPath, 'utf8');
	return JSON.parse(content);
}

export default async function HomePage() {
	const agendas = await getAgendas();
	const engagementData = await getEngagementData();
	const meetingsData = await getMeetingsData();
	const previousMeetings = await getPreviousMeetings();

	// Sort agendas by datetime in descending order (most recent first)
	const sortedAgendas = [...agendas].sort(
		(a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
	);

	// Sort meetings by timestamp in descending order (most recent first)
	const sortedMeetings = [...previousMeetings].sort(
		(a, b) => b.timestamp - a.timestamp,
	);

	return (
		<div className='flex min-h-screen flex-col'>
			<header className='sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6'>
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<h1 className='font-semibold text-lg'>Facilitator Dashboard</h1>
					</div>
					<div className='flex items-center gap-2'>
						<Button variant='outline' size='sm' asChild>
							<Link href='/agenda'>Agenda</Link>
						</Button>
						<Button variant='outline' size='sm' asChild>
							<Link href='/form'>Form</Link>
						</Button>
					</div>
				</div>
			</header>
			<main className='flex-1 p-4 md:p-6 space-y-6'>
				<div className='grid gap-4 md:grid-cols-3 lg:grid-cols-3'>
					<div className='bg-background overflow-hidden h-full'>
						<div className='px-6 pt-6 pb-2'>
							<h3 className='text-lg font-medium'>Actions</h3>
						</div>
						<div className='p-4 grid grid-cols-1 gap-4 h-[calc(100%-56px)]'>
							<Button
								className='w-full bg-black text-white hover:bg-black/90 h-full text-base border-2'
								asChild
							>
								<Link href='/meeting'>
									<Play className='mr-2' /> Start Meeting
								</Link>
							</Button>
							<Button
								className='w-full h-full text-base border-2'
								variant='outline'
								asChild
							>
								<Link href='/form'>
									<CalendarPlus className='mr-2' /> Create Agenda
								</Link>
							</Button>
						</div>
					</div>
					<div className='md:col-span-2'>
						<div className='bg-background overflow-hidden h-full'>
							<div className='px-6 pt-6 pb-2'>
								<h3 className='text-lg font-medium'>Analytics Overview</h3>
							</div>
							<div className='grid md:grid-cols-2 gap-4 p-4'>
								<Card>
									<CardHeader className='pb-0'>
										<CardTitle className='text-sm font-medium'>
											Guest Engagement
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
				</div>

				<Separator />

				<div className='grid gap-4 md:grid-cols-3'>
					<div className='md:col-span-1'>
						<Card>
							<CardHeader>
								<CardTitle>Previous Meetings</CardTitle>
								<CardDescription>Your recent meetings</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='space-y-4'>
									{sortedMeetings.map((meeting) => (
										<div
											key={meeting.id}
											className='border rounded-lg p-4 hover:bg-gray-50 transition-colors'
										>
											<div className='flex justify-between items-start'>
												<h3 className='font-medium'>{meeting.title}</h3>
												<Badge variant='outline'>
													{new Date(meeting.date).toLocaleDateString()}
												</Badge>
											</div>
											<div className='mt-2 space-y-2'>
												<div className='flex justify-between text-sm'>
													<span className='text-gray-600'>Duration:</span>
													<span className='font-medium'>
														{meeting.duration}
													</span>
												</div>
												<div className='flex justify-between text-sm'>
													<span className='text-gray-600'>
														Completed Items:
													</span>
													<span className='font-medium'>
														{meeting.completedItems}/{meeting.totalItems}
													</span>
												</div>
												<div className='flex justify-between text-sm'>
													<span className='text-gray-600'>Engagement:</span>
													<span className='font-medium'>
														{meeting.engagement}%
													</span>
												</div>
											</div>
											<div className='mt-4'>
												<Button
													size='sm'
													className='w-full bg-black text-white hover:bg-black/90'
													asChild
												>
													<Link href={`/meeting/detail/${meeting.timestamp}`}>
														View Details
													</Link>
												</Button>
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>

					<div className='md:col-span-2'>
						<Card>
							<CardHeader>
								<CardTitle>Created Agendas</CardTitle>
								<CardDescription>Your recent meeting agendas</CardDescription>
							</CardHeader>
							<CardContent>
								<div className='space-y-4'>
									{sortedAgendas.map((agenda) => (
										<div
											key={agenda.id}
											className='border rounded-lg p-4 hover:bg-gray-50 transition-colors'
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
											<div className='flex gap-2 mt-4'>
												<Button
													size='sm'
													className='bg-black text-white hover:bg-black/90'
													asChild
												>
													<Link href={`/agenda/${agenda.id}`}>Edit</Link>
												</Button>
												<Button
													size='sm'
													className='bg-black text-white hover:bg-black/90'
												>
													Stats
												</Button>
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</main>
		</div>
	);
}
