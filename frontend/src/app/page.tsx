'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
	const router = useRouter();

	useEffect(() => {
		router.push('/home');
	}, [router]);

	// This UI will only be shown briefly before redirect
	return (
		<main className='flex min-h-screen flex-col items-center justify-center p-4 sm:p-8'></main>
	);
}
