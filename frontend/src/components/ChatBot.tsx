'use client';

import React, {
	useEffect,
	useRef,
	useState,
	Dispatch,
	SetStateAction,
} from 'react';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';
import { agendaAPI } from '@/lib/api';
import { toast } from 'sonner';

export type Message = {
	id: string;
	content: string;
	role: 'user' | 'assistant';
};

// Import types from API utility (these would typically be in a separate types file)
// We're redefining them here to avoid circular imports, but in a real app,
// you'd create a separate types.ts file and import from there
type TimePlanPoint = {
	start: string;
	end: string;
	content: string;
};

type ParticipantInsight = {
	participant: string;
	insight: string;
};

// Reuse the attachment type definition
type Attachment = {
	name: string;
	content: string;
	type: string;
};

type AgendaData = {
	checklist: string[];
	time_plan: TimePlanPoint[];
	preparation_tips: string[];
	participants_insights: ParticipantInsight[];
	attachments?: Attachment[] | null;
};

// Interface cho props của ChatBot
interface ChatBotProps {
	onMessagesChange?: Dispatch<SetStateAction<Message[]>>;
}

export default function ChatBot(props: ChatBotProps) {
	const { onMessagesChange } = props;

	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [agendaData, setAgendaData] = useState<AgendaData | null>(null);
	const [previousAgendaData, setPreviousAgendaData] =
		useState<AgendaData | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Check if agenda data has changed by comparing key fields
	const hasAgendaChanged = (
		oldData: AgendaData | null,
		newData: AgendaData | null,
	): boolean => {
		if (!oldData && !newData) return false;
		if (!oldData || !newData) return true;

		// Compare checklist, time_plan and preparation_tips
		const checklistChanged =
			JSON.stringify(oldData.checklist) !== JSON.stringify(newData.checklist);
		const timePlanChanged =
			JSON.stringify(oldData.time_plan) !== JSON.stringify(newData.time_plan);
		const tipsChanged =
			JSON.stringify(oldData.preparation_tips) !==
			JSON.stringify(newData.preparation_tips);
		const insightsChanged =
			JSON.stringify(oldData.participants_insights) !==
			JSON.stringify(newData.participants_insights);

		return (
			checklistChanged || timePlanChanged || tipsChanged || insightsChanged
		);
	};

	// Fetch initial agenda data and chat history from localStorage on component mount
	useEffect(() => {
		const storedData = localStorage.getItem('agendaData');
		const storedMessages = localStorage.getItem('chatMessages');
		const storedAttachments = localStorage.getItem('attachments');

		let parsedData: AgendaData | null = null;

		if (storedData) {
			try {
				parsedData = JSON.parse(storedData) as AgendaData;

				// If we have attachments in separate localStorage, add them to agenda data
				if (storedAttachments) {
					try {
						const parsedAttachments = JSON.parse(
							storedAttachments,
						) as Attachment[];
						parsedData.attachments = parsedAttachments;

						// Update localStorage with the combined data
						localStorage.setItem('agendaData', JSON.stringify(parsedData));
						localStorage.removeItem('attachments'); // We no longer need this separate item
					} catch (error) {
						console.error('Error parsing attachments:', error);
					}
				}

				setAgendaData(parsedData);
				setPreviousAgendaData(parsedData);

				// Only load saved messages if they exist
				if (storedMessages) {
					try {
						const parsedMessages = JSON.parse(storedMessages) as Message[];
						setMessages(parsedMessages);
					} catch (error) {
						console.error('Error parsing chat messages:', error);
						addInitialMessage();
					}
				} else {
					// No messages, add initial message
					addInitialMessage();
				}
			} catch (error) {
				console.error('Error parsing agenda data:', error);
				addInitialMessage();
			}
		} else {
			// No agenda data
			setMessages([
				{
					id: nanoid(),
					content:
						"Hello! I'm Cue, your virtual meeting assistant. Please create an agenda first.",
					role: 'assistant',
				},
			]);
		}
	}, []);

	// Update previousAgendaData when agendaData changes
	useEffect(() => {
		if (agendaData && previousAgendaData) {
			// If the agenda changed, add an informational message instead of clearing chat history
			if (hasAgendaChanged(previousAgendaData, agendaData)) {
				// Add notification message about agenda update
				const updateMessage = {
					id: nanoid(),
					content:
						'The agenda has been updated. You can continue the conversation.',
					role: 'assistant' as const,
				};
				setMessages((prev) => [...prev, updateMessage]);
			}

			// Update the previous agenda data
			setPreviousAgendaData(agendaData);
		}
	}, [agendaData, previousAgendaData]);

	// Function to add initial welcome message
	const addInitialMessage = () => {
		const initialMessage = {
			id: nanoid(),
			content:
				"Hello! I'm your virtual facilitator assistant. Your agenda has been created. You can ask me questions about it or request changes.",
			role: 'assistant' as const,
		};
		setMessages([initialMessage]);
	};

	// Save messages to localStorage whenever they change
	useEffect(() => {
		if (messages.length > 0) {
			localStorage.setItem('chatMessages', JSON.stringify(messages));
		}
	}, [messages]);

	// Function to handle sending messages
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (input.trim() === '') return;

		// Add user message
		const userMessage: Message = {
			id: nanoid(),
			content: input,
			role: 'user',
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput('');
		setLoading(true);

		try {
			// Convert messages to the format expected by the backend
			const conversationHistory = messages.map((msg) => ({
				content: msg.content,
				role: msg.role,
			}));

			// Add the new user message
			conversationHistory.push({
				content: input,
				role: 'user',
			});

			// Use the API utility with conversation history and current agenda (which now includes attachments)
			const data = await agendaAPI.chatWithAgenda(
				input,
				conversationHistory,
				agendaData,
			);

			// Check if the agenda data was updated
			const isAgendaUpdated = hasAgendaChanged(agendaData, data);

			// Save the current agenda data for later comparison
			const previousData = agendaData;

			// Update agendaData state
			setAgendaData(data);

			// Update localStorage with the new agenda data
			localStorage.setItem('agendaData', JSON.stringify(data));

			// Determine if the guardrail tripwire was triggered (no agenda changes)
			const isTripwireTriggered =
				!isAgendaUpdated && JSON.stringify(data) === JSON.stringify(agendaData);

			// Add assistant message based on whether the agenda was updated or the tripwire was triggered
			let botMessage: Message;

			if (isTripwireTriggered) {
				// Show toast notification for tripwire
				toast.info("Your question isn't about the agenda", {
					description: 'I can only help with agenda-related questions.',
					duration: 4000,
				});

				botMessage = {
					id: nanoid(),
					content:
						"I'm sorry, but I can only assist with questions or changes related to your agenda. If you'd like to discuss something else, please use a different channel or be more specific about how it relates to your agenda.",
					role: 'assistant',
				};
			} else if (isAgendaUpdated) {
				botMessage = {
					id: nanoid(),
					content:
						"I've updated the agenda based on your request. The changes have been applied.",
					role: 'assistant',
				};
			} else {
				botMessage = {
					id: nanoid(),
					content:
						"I've reviewed your agenda. No changes were needed based on your request.",
					role: 'assistant',
				};
			}

			setMessages((prev) => [...prev, botMessage]);

			// Dispatch custom event to notify other components of agenda update
			if (isAgendaUpdated) {
				window.dispatchEvent(
					new CustomEvent('agendaUpdated', { detail: data }),
				);
			}
		} catch (error) {
			console.error('Error sending message:', error);

			// Add error message
			const errorMessage: Message = {
				id: nanoid(),
				content:
					'Sorry, there was an error processing your request. Please try again.',
				role: 'assistant',
			};

			setMessages((prev) => [...prev, errorMessage]);
		} finally {
			setLoading(false);
		}
	};

	// Scroll to bottom of chat when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	// Function to display agenda data as a formatted string
	const formatAgendaDataForDisplay = (data: AgendaData): string => {
		let formattedText = '**Current Agenda:**\n\n';

		// Checklist
		formattedText += '**Checklist:**\n';
		data.checklist.forEach((item, index) => {
			formattedText += `${index + 1}. ${item}\n`;
		});

		// Time Plan
		formattedText += '\n**Time Plan:**\n';
		data.time_plan.forEach((point) => {
			formattedText += `${point.start} - ${point.end}: ${point.content}\n`;
		});

		return formattedText;
	};

	// UseEffect để đồng bộ messages với parent component qua onMessagesChange
	useEffect(() => {
		if (onMessagesChange) {
			onMessagesChange(messages);
		}
	}, [messages, onMessagesChange]);

	return (
		<div className='flex flex-col w-full h-full border rounded-lg overflow-hidden bg-white'>
			{/* Chat messages */}
			<div className='flex-1 overflow-y-auto p-2 space-y-2'>
				{messages.map((message) => (
					<div
						key={message.id}
						className={cn(
							'flex',
							message.role === 'user' ? 'justify-end' : 'justify-start',
						)}
					>
						<div
							className={cn(
								'max-w-[85%] rounded-lg p-2 text-sm',
								message.role === 'user'
									? 'bg-black text-white'
									: 'bg-gray-100 text-gray-900',
							)}
						>
							<div className='whitespace-pre-wrap'>{message.content}</div>
						</div>
					</div>
				))}
				{loading && (
					<div className='flex justify-start'>
						<div className='bg-gray-100 rounded-lg p-2 max-w-[85%]'>
							<div className='flex space-x-1'>
								<div className='w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce' />
								<div className='w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0.2s]' />
								<div className='w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0.4s]' />
							</div>
						</div>
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input area */}
			<form onSubmit={handleSubmit} className='border-t p-2'>
				<div className='flex gap-2'>
					<input
						type='text'
						placeholder='Provide feedback or request changes to the agenda...'
						value={input}
						onChange={(e) => setInput(e.target.value)}
						disabled={loading}
						className='flex-1 border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black'
					/>
					<button
						type='submit'
						disabled={loading || input.trim() === ''}
						className='bg-black text-white px-3 py-1 text-sm rounded-md hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-black disabled:opacity-50'
					>
						Send
					</button>
				</div>
			</form>
		</div>
	);
}
