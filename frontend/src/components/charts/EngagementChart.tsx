'use client';

import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

interface EngagementChartProps {
	data: {
		date: string;
		engagement: number;
	}[];
}

export function EngagementChart({ data }: EngagementChartProps) {
	return (
		<div className='px-4 py-2'>
			<h4 className='text-base font-medium'>User Engagement</h4>
			<p className='text-sm text-muted-foreground'>
				Daily engagement for the past 14 days
			</p>
			<div className='h-[200px] mt-4'>
				<ResponsiveContainer width='100%' height='100%'>
					<AreaChart
						data={data}
						margin={{
							top: 10,
							right: 10,
							left: 0,
							bottom: 0,
						}}
					>
						<defs>
							<linearGradient id='colorEngagement' x1='0' y1='0' x2='0' y2='1'>
								<stop offset='5%' stopColor='#000000' stopOpacity={0.8} />
								<stop offset='95%' stopColor='#000000' stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
						<XAxis
							dataKey='date'
							className='text-xs'
							tickFormatter={(value) => {
								const date = new Date(value);
								return `${date.getDate()}/${date.getMonth() + 1}`;
							}}
						/>
						<YAxis className='text-xs' />
						<Tooltip
							content={({ active, payload }) => {
								if (active && payload && payload.length) {
									const date = new Date(payload[0].payload.date);
									const formattedDate = date.toLocaleDateString('en-US', {
										day: 'numeric',
										month: 'short',
									});

									return (
										<div className='rounded-lg border bg-background p-2 shadow-sm'>
											<div className='grid grid-cols-2 gap-2'>
												<div className='flex flex-col'>
													<span className='text-[0.70rem] uppercase text-muted-foreground'>
														Date
													</span>
													<span className='font-bold text-xs'>
														{formattedDate}
													</span>
												</div>
												<div className='flex flex-col'>
													<span className='text-[0.70rem] uppercase text-muted-foreground'>
														Engagement
													</span>
													<span className='font-bold text-xs'>
														{payload[0].value}
													</span>
												</div>
											</div>
										</div>
									);
								}
								return null;
							}}
						/>
						<Area
							type='monotone'
							dataKey='engagement'
							stroke='#000000'
							fillOpacity={1}
							fill='url(#colorEngagement)'
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
