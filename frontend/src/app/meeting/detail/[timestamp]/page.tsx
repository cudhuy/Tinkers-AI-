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
import { notFound } from 'next/navigation';
import path from 'path';
import fs from 'fs';

interface ChecklistItem {
	[key: string]: boolean;
}

interface Meeting {
	id: string;
	title: string;
	date: string;
	duration: string;
	engagement: number;
	completedItems: number;
	totalItems: number;
	timestamp?: number;
	checklist?: string[]; // Array of task names
	checklistChecked?: boolean[]; // Array of boolean values corresponding to checklist by index
}

async function getMeetingData(timestamp: string) {
	const filePath = path.join(
		process.cwd(),
		`src/data/mocked/meetings/${timestamp}.json`,
	);

	try {
		const content = await fs.promises.readFile(filePath, 'utf8');
		const meeting = JSON.parse(content);
		meeting.timestamp = parseInt(timestamp);
		return meeting;
	} catch (error) {
		console.error(
			`Error reading meeting data for timestamp ${timestamp}:`,
			error,
		);
		return null;
	}
}

export default async function MeetingDetailPage({
	params,
}: {
	params: { timestamp: string };
}) {
	const meeting = await getMeetingData(params.timestamp);

	if (!meeting) {
		notFound();
	}

	const meetingDate = new Date(meeting.date);

	return (
		<div className='flex min-h-screen flex-col'>
			<header className='sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6'>
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<h1 className='font-semibold text-lg'>Meeting Details</h1>
					</div>
					<div className='flex items-center gap-2'>
						<Button variant='outline' size='sm' asChild>
							<Link href='/'>Dashboard</Link>
						</Button>
					</div>
				</div>
			</header>

			<main className='flex-1 p-4 md:p-6'>
				<div className='max-w-6xl mx-auto space-y-6'>
					<Card>
						<CardHeader className='pb-3'>
							<div className='flex justify-between items-center'>
								<div>
									<CardTitle className='text-2xl'>{meeting.title}</CardTitle>
									<CardDescription>
										{meetingDate.toLocaleDateString()} at{' '}
										{meetingDate.toLocaleTimeString()}
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className='grid gap-6 md:grid-cols-4'>
								<div className='space-y-2'>
									<h3 className='text-sm font-medium text-gray-500'>
										Duration
									</h3>
									<p className='text-2xl font-bold'>{meeting.duration}</p>
								</div>
								<div className='space-y-2'>
									<h3 className='text-sm font-medium text-gray-500'>
										Completed Items
									</h3>
									<p className='text-2xl font-bold'>
										{meeting.completedItems}/{meeting.totalItems}
									</p>
								</div>
								<div className='space-y-2'>
									<h3 className='text-sm font-medium text-gray-500'>
										Engagement
									</h3>
									<p className='text-2xl font-bold'>{meeting.engagement}%</p>
								</div>
								<div className='space-y-2'>
									<h3 className='text-sm font-medium text-gray-500'>
										Efficiency
									</h3>
									<p className='text-2xl font-bold'>
										{Math.round(
											(meeting.completedItems / meeting.totalItems) * 100,
										)}
										%
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Checklist</CardTitle>
							<CardDescription>
								Tasks completed during the meeting
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ul className='space-y-2'>
								{meeting.checklist && meeting.checklist.length > 0 ? (
									meeting.checklist.map((task: string, index: number) => (
										<li key={index} className='flex items-start gap-2'>
											<input
												type='checkbox'
												id={`checklist-item-${index}`}
												className='h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer mt-1'
												checked={meeting.checklistChecked?.[index] || false}
												readOnly
											/>
											<label
												htmlFor={`checklist-item-${index}`}
												className={`text-sm cursor-pointer ${
													meeting.checklistChecked?.[index]
														? 'text-gray-400 line-through'
														: 'text-gray-700'
												}`}
											>
												{task}
											</label>
										</li>
									))
								) : (
									<li className='flex items-start gap-2'>
										<input
											type='checkbox'
											id='checklist-item-1'
											className='h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer mt-1'
											readOnly
										/>
										<label
											htmlFor='checklist-item-1'
											className='text-sm text-gray-700 cursor-pointer'
										>
											Consider shorter meetings (your meeting was{' '}
											{meeting.duration} long)
										</label>
									</li>
								)}
							</ul>
						</CardContent>
					</Card>

					<div className='flex justify-center'>
						<Button variant='outline' size='lg' asChild>
							<Link href='/'>Back to Dashboard</Link>
						</Button>
					</div>
				</div>
			</main>
		</div>
	);
}
