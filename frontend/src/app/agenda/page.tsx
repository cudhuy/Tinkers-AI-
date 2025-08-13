'use client';

import ChatBot from '@/components/ChatBot';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Define types (in a real app, these would be in a shared types file)
type TimePlanPoint = {
	start: string;
	end: string;
	content: string;
};

type ParticipantInsight = {
	participant: string;
	insight: string;
};

type Attachment = {
	name: string;
	content: string;
	type: string;
};

type AgendaData = {
	title: string;
	checklist: string[];
	time_plan: TimePlanPoint[];
	preparation_tips: string[];
	participants_insights: ParticipantInsight[];
	attachments?: Attachment[] | null;
};

export default function AgendaPage() {
	const [agendaData, setAgendaData] = useState<AgendaData | null>(null);
	const [loading, setLoading] = useState(true);
	const [agendaAccepted, setAgendaAccepted] = useState(false);
	const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
	const router = useRouter();

	// Load initial agenda data
	useEffect(() => {
		// Retrieve agenda data from localStorage
		const storedData = localStorage.getItem('agendaData');

		if (storedData) {
			try {
				const data = JSON.parse(storedData) as AgendaData;
				console.log('Agenda data received:', data);
				setAgendaData(data);
			} catch (error) {
				console.error('Error parsing agenda data:', error);
			}
		} else {
			// Redirect to form if no data is available
			router.push('/form');
		}
		setLoading(false);
	}, [router]);

	// Listen for agenda updates from the chat component
	useEffect(() => {
		const handleAgendaUpdate = (event: CustomEvent<AgendaData>) => {
			setAgendaData(event.detail);
		};

		// Add event listener
		window.addEventListener(
			'agendaUpdated',
			handleAgendaUpdate as EventListener,
		);

		// Cleanup
		return () => {
			window.removeEventListener(
				'agendaUpdated',
				handleAgendaUpdate as EventListener,
			);
		};
	}, []);

	const handleAcceptAgenda = async () => {
		if (!agendaData) return;

		try {
			setLoading(true);

			// Generate a default title if none exists
			const title = agendaData.title;

			// Prepare the data to send - which already includes attachments
			const dataToSend = {
				...agendaData,
				title: title,
			};

			// Call the API endpoint to save the agenda
			const response = await fetch('/api/accepted-agenda', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(dataToSend),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to save agenda');
			}

			const result = await response.json();
			console.log('Agenda saved:', result);

			setAgendaAccepted(true);
			toast.success('Agenda accepted and saved successfully!');

			// Redirect to home dashboard after a short delay for the toast to be visible
			setTimeout(() => {
				router.push('/'); // Redirects to the home dashboard
			}, 800);
		} catch (error) {
			console.error('Error saving agenda:', error);
			toast.error(
				error instanceof Error ? error.message : 'Failed to save agenda',
			);
		} finally {
			setLoading(false);
		}
	};

	const handleCheckItem = (index: number) => {
		setCheckedItems((prev) => ({
			...prev,
			[index]: !prev[index],
		}));
	};

	if (loading) {
		return (
			<div className='flex min-h-screen items-center justify-center'>
				<div className='text-center'>
					<h2 className='text-2xl font-semibold mb-4'>Loading agenda...</h2>
					<div className='flex justify-center space-x-2'>
						<div className='w-3 h-3 rounded-full bg-gray-400 animate-bounce' />
						<div className='w-3 h-3 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]' />
						<div className='w-3 h-3 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]' />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='flex min-h-screen flex-col p-2 sm:p-4'>
			<h1 className='text-2xl font-bold text-center mb-3'>
				Your Meeting Agenda
			</h1>

			<div className='flex flex-col lg:flex-row gap-3 h-[calc(100vh-80px)]'>
				{/* Agenda panel (left side on large screens) */}
				<div className='w-full lg:w-1/2 overflow-y-auto pb-2'>
					{agendaData && (
						<div className='space-y-3'>
							{/* Top row with Checklist and Preparation Tips */}
							<div className='grid grid-cols-2 gap-3'>
								<div className='bg-white rounded-lg shadow-sm overflow-hidden'>
									<h2 className='text-base font-semibold p-2 bg-gray-400 text-white'>
										Checklist
									</h2>
									<div className='p-3 space-y-1'>
										{agendaData.checklist.map((item, index) => (
											<div key={index} className='flex items-start gap-2'>
												<div className='relative flex items-center'>
													<input
														type='checkbox'
														id={`checklist-item-${index}`}
														className='h-4 w-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer'
														checked={checkedItems[index] || false}
														onChange={() => handleCheckItem(index)}
													/>
												</div>
												<label
													htmlFor={`checklist-item-${index}`}
													className={`text-sm cursor-pointer ${
														checkedItems[index]
															? 'text-gray-400 line-through'
															: 'text-gray-700'
													}`}
												>
													{item}
												</label>
											</div>
										))}
									</div>
								</div>

								<div className='bg-white rounded-lg shadow-sm overflow-hidden'>
									<h2 className='text-base font-semibold p-2 bg-gray-400 text-white'>
										Preparation Tips
									</h2>
									<div className='p-3'>
										<ul className='list-disc list-inside text-sm space-y-0.5'>
											{agendaData.preparation_tips.map((tip, index) => (
												<li key={index} className='text-gray-700'>
													{tip}
												</li>
											))}
										</ul>
									</div>
								</div>
							</div>

							{/* Middle row with Time Plan and Participant Insights */}
							<div className='grid grid-cols-2 gap-3'>
								<div className='bg-white rounded-lg shadow-sm overflow-hidden'>
									<h2 className='text-base font-semibold p-2 bg-gray-400 text-white'>
										Time Plan
									</h2>
									<div className='p-3 space-y-2'>
										{agendaData.time_plan.map((point, index) => (
											<div
												key={index}
												className='border-l-2 border-gray-300 pl-2'
											>
												<div className='text-xs font-medium text-gray-500'>
													{point.start} - {point.end}
												</div>
												<div className='mt-0.5 text-sm'>{point.content}</div>
											</div>
										))}
									</div>
								</div>

								<div className='bg-white rounded-lg shadow-sm overflow-hidden'>
									<h2 className='text-base font-semibold p-2 bg-gray-400 text-white'>
										Participant Insights
									</h2>
									<div className='p-3 space-y-2'>
										{agendaData.participants_insights.map((insight, index) => (
											<div key={index} className='p-2 bg-gray-50 rounded-md'>
												<div className='font-medium text-sm'>
													{insight.participant}
												</div>
												<div className='text-gray-700 text-xs mt-0.5'>
													{insight.insight}
												</div>
											</div>
										))}
									</div>
								</div>
							</div>

							{/* Accept Agenda Button - now spans full width of the two cards and is taller */}
							<div className='col-span-2 mt-4'>
								<button
									onClick={handleAcceptAgenda}
									disabled={agendaAccepted || loading}
									className='w-full bg-black text-white py-4 text-base font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-black disabled:opacity-50 transition-all'
								>
									{loading
										? 'Saving...'
										: agendaAccepted
										? 'Agenda Accepted'
										: 'Accept Agenda'}
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Chat panel (right side on large screens) */}
				<div className='w-full lg:w-1/2 h-full flex flex-col'>
					<div className='flex-grow'>
						<ChatBot />
					</div>
				</div>
			</div>
		</div>
	);
}
