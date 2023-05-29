import Express from "express";
import dotenv from 'dotenv';
import mongoose from "mongoose";
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from "./models/User.js";
import Table from "./models/Table.js";

const app = Express()

app.use(cors());

dotenv.config()

const uri = process.env.MONGO_URL

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })

const db = mongoose.connection

db.once('open',
  () => {
    console.log('connected');
  }
)
app.use(Express.json())

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.sendStatus(401);
  }

  jwt.verify(token, 'your-secret-key', (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    console.log(user)
    req.user = user;
    next();
  });
};
// User Registration
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  console.log(name,email,password)
  try {
    // Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    // Save the user to the database
    await newUser.save();

    // Generate a JWT token
    const token = jwt.sign({ userId: newUser._id }, 'your-secret-key');

    // Assign the token to the user and save it
    newUser.token = token;
    await newUser.save();

    res.status(201).json({ message: 'Registration successful', token , email});
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Compare the provided password with the stored hash
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate a new JWT token
    const token = jwt.sign({ userId: user._id }, 'your-secret-key');

    // Assign the token to the user and save it
    user.token = token;
    await user.save();

    res.json({ message: 'Login successful', token,email });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});





app.post('/add/tournament',authenticateToken,async(req,res)=>{
  const userId=req.user.userId
  const { organiser, tourneyname, KillPoints, placepoints } = req.body;
  try {
    // Create a new tournament
    const newTournament = new Table({
      user: userId,
      organiser,
      tourneyname,
      KillPoints,
      placepoints
    });

    // Save the tournament to the database
    await newTournament.save();

    res.status(201).json({ message: 'Tournament created successfully', tournament: newTournament });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create tournament' });
  }

})

app.delete('/delete/tournament/:tournamentId', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const tournamentId = req.params.tournamentId;

  try {
    // Find the tournament by ID and check if it belongs to the authenticated user
    const tournament = await Table.findOne({ _id: tournamentId, user: userId });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Delete the tournament from the database
    await Table.findByIdAndDelete(tournamentId);

    res.status(200).json({ message: 'Tournament deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

app.get('/get/tournament', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    // Retrieve tournaments for the specific user
    const tournaments = await Table.find({ user: userId });
    console.log(tournaments)
    res.json({ tournaments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});


//teams
app.post('/add/team/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { team } = req.body;
  const tournamentId = req.params.id;

  try {
    const tournament = await Table.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Check if the authenticated user is the owner of the tournament
    if (tournament.user.toString() !== userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    tournament.Teams.push(team);
    await tournament.save();

    return res.status(200).json({ message: 'Team added successfully', tournament });
  } catch (error) {
    console.error('Error adding team:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


app.delete('/delete/team/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { team } = req.body;
  const tournamentId = req.params.id;

  try {
    const tournament = await Table.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Check if the authenticated user is the owner of the tournament
    if (tournament.user.toString() !== userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find the index of the team in the Teams array
    const teamIndex = tournament.Teams.indexOf(team);

    if (teamIndex === -1) {
      return res.status(404).json({ message: 'Team not found in the tournament' });
    }

    // Remove the team from the Teams array
    tournament.Teams.splice(teamIndex, 1);
    await tournament.save();

    return res.status(200).json({ message: 'Team deleted successfully', tournament });
  } catch (error) {
    console.error('Error deleting team:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


app.get('/get/teams/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const tournamentId = req.params.id;

  try {
    const tournament = await Table.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Check if the authenticated user is the owner of the tournament
    if (tournament.user.toString() !== userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const teams = tournament.Teams;

    return res.status(200).json({ teams,tournament });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/add/result/:id',authenticateToken,async(req, res) => {
  const tournamentId = req.params.id;
  const userId = req.user.userId;
  const { results } = req.body;

  try {
    const tournament = await Table.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Check if the authenticated user is the owner of the tournament
    if (tournament.user.toString() !== userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await Table.findByIdAndUpdate(tournamentId,{$push:{Match:{matches:results}}});
    await tournament.save();
    return res.status(200).json({ message: 'Result added successfully', tournament });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


app.delete('/delete/result/:id/:matchId', authenticateToken, async (req, res) => {
  const tournamentId = req.params.id;
  const userId = req.user.userId;
  const  matchId = req.params.matchId;

  try {
    const tournament = await Table.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    // Check if the authenticated user is the owner of the tournament
    if (tournament.user.toString() !== userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const matchIndex = tournament.Match.findIndex((match) => match._id.toString() === matchId);

    if (matchIndex === -1) {
      return res.status(404).json({ message: 'Match not found' });
    }

    tournament.Match.splice(matchIndex, 1);
    await tournament.save();
    
    return res.status(200).json({ message: 'Match deleted successfully', tournament });
  } catch (error) {
    console.error('Error deleting match:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

const PORT = 8000


app.listen(process.env.APP_PORT, () => console.log('runnin'))