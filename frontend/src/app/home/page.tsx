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

	// Sort agendas by datetime in descending order (most recent first)
	const sortedAgendas = [...agendas].sort(
		(a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime(),
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
					<Card>
						<CardHeader className='pb-2'>
							<CardTitle> Actions</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<Button
								className='w-full bg-black text-white hover:bg-black/90 py-6'
								asChild
							>
								<Link href='/meeting'>Start Meeting</Link>
							</Button>
							<Button className='w-full py-6' variant='outline' asChild>
								<Link href='/form'>Create Agenda</Link>
							</Button>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className='pb-2'>
							<CardTitle>Upcoming Sessions</CardTitle>
							<CardDescription>Next 24 hours</CardDescription>
						</CardHeader>
						<CardContent>
							<div className='text-3xl font-bold'>2</div>
							<div className='flex items-center gap-2 text-sm mt-2'>
								<Badge variant='outline'>Scheduled</Badge>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className='pb-2'>
							<CardTitle>Activity Overview</CardTitle>
							<CardDescription>Past 7 days</CardDescription>
						</CardHeader>
						<CardContent>
							<div className='text-3xl font-bold'>12</div>
							<div className='flex items-center gap-2 text-sm mt-2'>
								<Badge
									variant='outline'
									className='text-blue-500 border-blue-500'
								>
									Completed
								</Badge>
							</div>
						</CardContent>
					</Card>
				</div>

				<Separator />

				<div className='grid gap-4 md:grid-cols-3'>
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
											<p className='text-sm text-gray-500 mt-2'>
												{extractFirstSentence(agenda.content)}
											</p>
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
					<div className='space-y-4'>
						<div className='bg-background overflow-hidden'>
							<div className='px-6 pt-6 pb-2'></div>
							<div>
								<EngagementChart data={engagementData} />
								<Separator className='my-2' />
								<MeetingsChart data={meetingsData} />
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
