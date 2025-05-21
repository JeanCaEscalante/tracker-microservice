const express = require('express')
const app = express()
const mongoose = require('mongoose')

const cors = require('cors')
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(cors())
app.use(express.static('public'))

const userSchema = new mongoose.Schema({
  username: String,
  log: [{
    description: String,
    duration: Number,
    date: Date
  }]
});

const User = mongoose.model('User', userSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  try {
    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required' });
  }

  const durationNum = parseInt(duration, 10);
  if (isNaN(durationNum)) {
    return res.status(400).json({ error: 'Duration must be a number' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const exerciseDate = date ? new Date(date) : new Date();
    if (isNaN(exerciseDate.getTime())) {
      exerciseDate = new Date();
    }

    user.log.push({
      description,
      duration: durationNum,
      date: exerciseDate
    });

    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      description,
      duration: durationNum,
      date: exerciseDate.toDateString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let log = user.log;

    if (from) {
      const fromDate = new Date(from);
      log = log.filter(entry => entry.date >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      log = log.filter(entry => entry.date <= toDate);
    }

    if (limit) {
      log = log.slice(0, parseInt(limit, 10));
    }

    const formattedLog = log.map(entry => ({
      description: entry.description,
      duration: entry.duration,
      date: entry.date.toDateString()
    }));

    res.json({
      username: user.username,
      _id: user._id,
      count: formattedLog.length,
      log: formattedLog
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
