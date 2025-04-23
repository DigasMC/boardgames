import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const players = searchParams.get('players');
    const maxDuration = searchParams.get('maxDuration');

    const query: Record<string, unknown> = {};
    
    if (players) {
      const numPlayers = parseInt(players, 10);
      query.min_players = { $lte: numPlayers };
      query.max_players = { $gte: numPlayers };
    }
    
    if (maxDuration) {
      query.avg_duration = { $lte: parseInt(maxDuration, 10) };
    }

    const { db } = await connectToDatabase();
    const games = await db.collection('Games').find(query).toArray();
    
    return NextResponse.json(games);
  } catch (err) {
    console.error('Error fetching games:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 