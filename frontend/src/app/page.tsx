'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function Home() {
	const router = useRouter();

	return (
		<main className='flex min-h-screen flex-col items-center justify-center p-4 sm:p-8'>
			<div className='max-w-3xl mx-auto text-center space-y-8'>
				<h1 className='text-4xl font-bold'>AI Meeting Facilitator</h1>
				<p className='text-xl'>
					Create smarter meeting agendas and get AI assistance before, during,
					and after your meetings.
				</p>

				<div className='flex flex-col sm:flex-row items-center justify-center gap-4 mt-8'>
					<Button
						onClick={() => router.push('/form')}
						className='bg-black text-white px-8 py-6 text-lg rounded-md hover:bg-gray-800'
					>
						Create a New Meeting
					</Button>
				</div>
			</div>
		</main>
	);
}
