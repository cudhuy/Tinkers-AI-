import { Button } from '@/components/ui/button';
import Link from 'next/link';
import path from 'path';
import fs from 'fs';
import { MeetingContent } from './MeetingContent';

interface Agenda {
	id: string;
	title: string;
	datetime: string;
	content: string;
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

export default async function MeetingPage() {
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
						<h1 className='font-semibold text-lg'>Meeting</h1>
					</div>
					<div className='flex items-center gap-2'>
						<Button variant='outline' size='sm' asChild>
							<Link href='/'>Dashboard</Link>
						</Button>
					</div>
				</div>
			</header>

			<MeetingContent
				agendas={sortedAgendas}
				engagementData={engagementData}
				meetingsData={meetingsData}
			/>
		</div>
	);
}
