require('dotenv').config();
const mongoose = require('mongoose');
const Chat = require('./models/Chat');
const Complaint = require('./models/Complaint');

async function debugChat() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all chats
    const allChats = await Chat.find({});
    console.log('\n=== ALL CHATS IN DATABASE ===');
    allChats.forEach((chat, index) => {
      console.log(`\nChat ${index + 1}:`);
      console.log('ID:', chat._id);
      console.log('Complaint ID:', chat.complaintId);
      console.log('Chat Type:', chat.chatType);
      console.log('Participants:', chat.participants.length);
      console.log('Messages:', chat.messages.length);
      
      if (chat.messages.length > 0) {
        console.log('Sample message:', chat.messages[0].content.substring(0, 50));
      }
    });

    // Find all complaints with in_progress status
    const inProgressComplaints = await Complaint.find({ status: 'in_progress' })
      .populate('userId', 'name email');
      
    console.log('\n=== IN_PROGRESS COMPLAINTS ===');
    inProgressComplaints.forEach((complaint, index) => {
      console.log(`\nComplaint ${index + 1}:`);
      console.log('ID:', complaint._id);
      console.log('Status:', complaint.status);
      console.log('User ID:', complaint.userId ? complaint.userId._id : 'null');
      console.log('User email:', complaint.userId ? complaint.userId.email : 'null');
      
      // Check if this complaint has any chats
      const complaintChats = allChats.filter(chat => 
        chat.complaintId.toString() === complaint._id.toString()
      );
      console.log('Associated chats:', complaintChats.length);
      complaintChats.forEach(chat => {
        console.log('  - Chat type:', chat.chatType, 'Messages:', chat.messages.length);
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

debugChat();