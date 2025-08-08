'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { agendaAPI } from '@/lib/api';
import { X } from 'lucide-react';

// Define the form schema using zod
const formSchema = z.object({
	title: z.string().min(2, {
		message: 'Title must be at least 2 characters.',
	}),

	description: z.string().optional(),

	time: z.string().nonempty('Please select meeting duration'),

	type_of_meeting: z
		.enum(['Sales Meeting', 'Internal Meeting'])
		.refine((val) => !!val, { message: 'Please select a valid meeting type' })
		.optional(),
	// Participants will be handled separately
});

// Define the form type
type FormValues = z.infer<typeof formSchema>;

export default function FormPage() {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [participants, setParticipants] = useState<string[]>([]);
	const [newParticipant, setNewParticipant] = useState('');
	const [participantsError, setParticipantsError] = useState('');

	// Define the form
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: '',
			description: '',
			time: '30',
			type_of_meeting: undefined,
		},
	});

	const addParticipant = () => {
		if (!newParticipant.trim()) {
			setParticipantsError('Participant name cannot be empty');
			return;
		}

		setParticipants([...participants, newParticipant.trim()]);
		setNewParticipant('');
		setParticipantsError('');
	};

	const removeParticipant = (index: number) => {
		const updatedParticipants = [...participants];
		updatedParticipants.splice(index, 1);
		setParticipants(updatedParticipants);
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			addParticipant();
		}
	};

	// Submit handler
	async function onSubmit(values: z.infer<typeof formSchema>) {
		setIsSubmitting(true);
		try {
			// Convert time to HH:MM:SS format
			const minutes = parseInt(values.time);
			const hours = Math.floor(minutes / 60);
			const remainingMinutes = minutes % 60;
			const meetingDuration = `${hours
				.toString()
				.padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:00`;

			const payload = {
				title: values.title,
				meeting_duration: meetingDuration,
				description: values.description || null,
				type_of_meeting: values.type_of_meeting || null,
				participants: participants.length > 0 ? participants : null,
			};

			console.log('Sending payload:', payload);

			// Use the API utility instead of direct fetch
			const data = await agendaAPI.createAgenda(payload);

			// Store the agenda data in localStorage to access it on the agenda page
			localStorage.setItem('agendaData', JSON.stringify(data));

			// Clear any existing chat messages for the previous agenda
			localStorage.removeItem('chatMessages');

			// Remove the previous agenda hash to force a chat reset
			localStorage.removeItem('agendaHash');

			// Redirect to agenda page
			router.push('/agenda');
		} catch (error) {
			console.error('Error submitting form:', error);
			alert('Failed to submit form. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className='flex min-h-screen flex-col items-center justify-center p-4 sm:p-8'>
			<div className='w-full max-w-md space-y-6'>
				<div className='space-y-2 text-center'>
					<h1 className='text-3xl font-bold'>Meeting Information</h1>
					<p className='text-gray-500 dark:text-gray-400'>
						Enter the details for your upcoming meeting
					</p>
				</div>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
						<FormField
							control={form.control}
							name='title'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Meeting Title</FormLabel>
									<FormControl>
										<Input placeholder='Enter meeting title' {...field} />
									</FormControl>
									<FormDescription>
										Give your meeting a clear, descriptive title.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name='description'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description (Optional)</FormLabel>
									<FormControl>
										<Textarea
											placeholder='Enter meeting description and goals'
											className='min-h-[100px] resize-none'
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Describe the purpose and goals of this meeting.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Participants section with add/remove functionality */}
						<div>
							<FormLabel>Participants (Optional)</FormLabel>
							<div className='flex mt-2 mb-2'>
								<Input
									value={newParticipant}
									onChange={(e) => setNewParticipant(e.target.value)}
									onKeyDown={handleKeyPress}
									placeholder='Enter participant name'
									className='flex-grow'
								/>
								<Button type='button' onClick={addParticipant} className='ml-2'>
									Add
								</Button>
							</div>

							{participantsError && (
								<p className='text-sm font-medium text-red-500 mt-1'>
									{participantsError}
								</p>
							)}

							<div className='mt-2'>
								{participants.length > 0 ? (
									<div className='flex flex-wrap gap-2'>
										{participants.map((participant, index) => (
											<div
												key={index}
												className='bg-gray-100 px-3 py-1 rounded-full flex items-center text-sm'
											>
												<span>{participant}</span>
												<button
													type='button'
													onClick={() => removeParticipant(index)}
													className='ml-2 text-gray-500 hover:text-gray-700'
												>
													<X size={14} />
												</button>
											</div>
										))}
									</div>
								) : (
									<p className='text-sm text-gray-500'>
										No participants added yet
									</p>
								)}
							</div>
							<FormDescription className='mt-2'>
								Add the people who will attend the meeting
							</FormDescription>
						</div>

						<FormField
							control={form.control}
							name='time'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Meeting Duration</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder='Select meeting duration' />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value='15'>15 minutes</SelectItem>
											<SelectItem value='30'>30 minutes</SelectItem>
											<SelectItem value='45'>45 minutes</SelectItem>
											<SelectItem value='60'>1 hour</SelectItem>
											<SelectItem value='90'>1 hour 30 minutes</SelectItem>
											<SelectItem value='120'>2 hours</SelectItem>
											<SelectItem value='180'>3 hours</SelectItem>
										</SelectContent>
									</Select>
									<FormDescription>
										Choose the expected duration of the meeting.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name='type_of_meeting'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Meeting Type (Optional)</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder='Select a meeting type' />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value='Sales Meeting'>
												Sales Meeting
											</SelectItem>
											<SelectItem value='Internal Meeting'>
												Internal Meeting
											</SelectItem>
										</SelectContent>
									</Select>
									<FormDescription>
										Choose the type of meeting you're planning.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type='submit' className='w-full' disabled={isSubmitting}>
							{isSubmitting ? 'Submitting...' : 'Submit'}
						</Button>
					</form>
				</Form>
			</div>
		</div>
	);
}
