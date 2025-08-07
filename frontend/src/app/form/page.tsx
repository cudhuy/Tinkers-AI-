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

// Define the form schema using zod
const formSchema = z.object({
	title: z.string().min(2, {
		message: 'Title must be at least 2 characters.',
	}),
	agenda: z.string().min(5, {
		message: 'Agenda must be at least 5 characters.',
	}),
	meetingTime: z.string().nonempty('Please select meeting duration'),
	meetingType: z.enum(['sales', 'internal'], {
		message: 'Please select a valid meeting type.',
	}),
});

// Generate time options from 15min to 3h in 15min increments
const timeOptions = Array.from({ length: 12 }, (_, i) => {
	const minutes = (i + 1) * 15;
	let display;

	if (minutes < 60) {
		display = `${minutes} minutes`;
	} else {
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		display =
			remainingMinutes > 0
				? `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`
				: `${hours} hour${hours > 1 ? 's' : ''}`;
	}

	return { value: minutes.toString(), display };
});

export default function FormPage() {
	const router = useRouter();

	// Define the form
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: '',
			agenda: '',
			meetingTime: '',
			meetingType: undefined,
		},
	});

	// Submit handler
	function onSubmit(values: z.infer<typeof formSchema>) {
		console.log(values);
		// Instead of alert, redirect to agenda page
		router.push('/agenda');
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
							name='agenda'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Agenda</FormLabel>
									<FormControl>
										<Textarea
											placeholder='Enter meeting agenda'
											className='min-h-[100px] resize-none'
											{...field}
										/>
									</FormControl>
									<FormDescription>
										Outline the key points to be discussed.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name='meetingTime'
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
											{timeOptions.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.display}
												</SelectItem>
											))}
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
							name='meetingType'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Meeting Type</FormLabel>
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
											<SelectItem value='sales'>Sales</SelectItem>
											<SelectItem value='internal'>Internal</SelectItem>
										</SelectContent>
									</Select>
									<FormDescription>
										Choose the type of meeting you're planning.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type='submit' className='w-full'>
							Submit
						</Button>
					</form>
				</Form>
			</div>
		</div>
	);
}
