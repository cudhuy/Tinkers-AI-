'use client';

import ChatBot from '@/components/ChatBot';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

type AgendaData = {
	checklist: string[];
	time_plan: TimePlanPoint[];
	preparation_tips: string[];
	participants_insights: ParticipantInsight[];
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

	const handleAcceptAgenda = () => {
		setAgendaAccepted(true);
		console.log('Agenda accepted');
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
								<div className='bg-white p-3 rounded-lg shadow-sm'>
									<h2 className='text-base font-semibold mb-2'>Checklist</h2>
									<div className='space-y-1'>
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

								<div className='bg-white p-3 rounded-lg shadow-sm'>
									<h2 className='text-base font-semibold mb-2'>
										Preparation Tips
									</h2>
									<ul className='list-disc list-inside text-sm space-y-0.5'>
										{agendaData.preparation_tips.map((tip, index) => (
											<li key={index} className='text-gray-700'>
												{tip}
											</li>
										))}
									</ul>
								</div>
							</div>

							{/* Middle row with Time Plan and Participant Insights */}
							<div className='grid grid-cols-2 gap-3'>
								<div className='bg-white p-3 rounded-lg shadow-sm'>
									<h2 className='text-base font-semibold mb-2'>Time Plan</h2>
									<div className='space-y-2'>
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

								<div className='bg-white p-3 rounded-lg shadow-sm'>
									<h2 className='text-base font-semibold mb-2'>
										Participant Insights
									</h2>
									<div className='space-y-2'>
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

							{/* Accept Agenda Button */}
							<div className='flex justify-center mt-2'>
								<button
									onClick={handleAcceptAgenda}
									disabled={agendaAccepted}
									className='bg-black text-white px-4 py-1.5 text-sm rounded-md hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-black disabled:opacity-50 transition-all'
								>
									{agendaAccepted ? 'Agenda Accepted' : 'Accept Agenda'}
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Chat panel (right side on large screens) */}
				<div className='w-full lg:w-1/2 h-full flex flex-col'>
					<h2 className='text-xl font-semibold mb-2 text-center'>
						Chat with AI Facilitator
					</h2>
					<div className='flex-grow'>
						<ChatBot />
					</div>
				</div>
			</div>
		</div>
	);
}
