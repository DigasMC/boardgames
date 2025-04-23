import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Game from '@/models/Game';
import mongoose from 'mongoose';

export async function GET(request: Request) {
  try {
    console.log('Connecting to MongoDB...');
    const db = await connectDB();
    console.log('MongoDB connected, fetching games...');
    
    if (db?.connection?.db) {
      console.log('Database name:', db.connection.db.databaseName);
      
      // List all collections in the database
      const collections = await db.connection.db.listCollections().toArray();
      console.log('Available collections:', collections.map(c => c.name));
    }
    
    const { searchParams } = new URL(request.url);
    const players = searchParams.get('players');
    const maxDuration = searchParams.get('maxDuration');
    
    let query: any = {};
    
    if (players) {
      query.min_players = { $lte: parseInt(players) };
      query.max_players = { $gte: parseInt(players) };
    }
    
    if (maxDuration) {
      query.avg_duration = { $lte: parseInt(maxDuration) };
    }
    
    console.log('Query:', query);
    
    // Try to find games with and without filters
    const allGames = await Game.find({});
    console.log('Total games found (no filters):', allGames.length);
    
    const games = await Game.find(query);
    console.log('Games found with filters:', games.length);
    
    return NextResponse.json(games);
  } catch (error) {
    console.error('Error in GET /api/games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch games', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 