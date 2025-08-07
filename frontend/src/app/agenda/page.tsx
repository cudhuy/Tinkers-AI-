'use client';

import ChatBot from '@/components/ChatBot';
import { useState } from 'react';

export default function AgendaPage() {
	const [agendaAccepted, setAgendaAccepted] = useState(false);

	const handleAcceptAgenda = () => {
		setAgendaAccepted(true);
		console.log('Agenda accepted');
		// Additional logic can be added here
	};

	return (
		<div className='flex min-h-screen flex-col items-center justify-center p-4 sm:p-8'>
			<div className='w-full max-w-6xl space-y-6'>
				{/* ChatBot UI */}
				<div>
					<ChatBot />
				</div>

				{/* Accept Agenda Button */}
				<div className='flex justify-center mt-6'>
					<button
						onClick={handleAcceptAgenda}
						disabled={agendaAccepted}
						className='bg-black text-white px-8 py-3 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50 transition-all'
					>
						{agendaAccepted ? 'Agenda Accepted' : 'Accept Agenda'}
					</button>
				</div>
			</div>
		</div>
	);
}
