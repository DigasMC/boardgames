import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Game from '@/models/Game';

export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const minPlayers = searchParams.get('minPlayers');
    const maxPlayers = searchParams.get('maxPlayers');
    const maxDuration = searchParams.get('maxDuration');
    
    let query: any = {};
    
    if (minPlayers) {
      query.min_players = { $lte: parseInt(minPlayers) };
    }
    
    if (maxPlayers) {
      query.max_players = { $gte: parseInt(maxPlayers) };
    }
    
    if (maxDuration) {
      query.avg_duration = { $lte: parseInt(maxDuration) };
    }
    
    const count = await Game.countDocuments(query);
    const random = Math.floor(Math.random() * count);
    const game = await Game.findOne(query).skip(random);
    
    return NextResponse.json(game);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch random game' }, { status: 500 });
  }
} 