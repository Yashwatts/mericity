const mongoose = require("mongoose");
const Chat = require("./models/Chat");
const Complaint = require("./models/Complaint");

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/SIH2024", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to MongoDB");
  debugChatInit();
}).catch((err) => {
  console.error("MongoDB connection error:", err);
});

async function debugChatInit() {
  try {
    console.log("\n=== Debugging Chat Initialization Issue ===");
    
    // Find any complaint with in_progress status
    const complaint = await Complaint.findOne({ status: 'in_progress' })
      .populate('userId', 'name email')
      .populate('assignedAdmin', 'name email')
      .populate('assignedDepartment', 'name email');
    
    if (!complaint) {
      console.log("No in_progress complaint found. Please create one first.");
      process.exit(1);
    }
    
    console.log(`\n📋 Testing with complaint: ${complaint._id}`);
    console.log(`   User: ${complaint.userId?.name || 'None'}`);
    console.log(`   Admin: ${complaint.assignedAdmin?.name || 'None'}`);
    console.log(`   Department: ${complaint.assignedDepartment?.name || 'None'}`);
    
    // Check all existing chats for this complaint
    const allChats = await Chat.find({ complaintId: complaint._id });
    console.log(`\n💬 Existing chats for this complaint: ${allChats.length}`);
    
    allChats.forEach((chat, index) => {
      console.log(`   ${index + 1}. Type: ${chat.chatType}, Messages: ${chat.messages?.length || 0}`);
      console.log(`      Participants: ${chat.participants?.map(p => `${p.participantRole}(${p.participantName})`).join(', ')}`);
      
      if (chat.messages && chat.messages.length > 0) {
        console.log(`      Recent messages:`);
        chat.messages.slice(-2).forEach((msg, msgIndex) => {
          console.log(`        - [${msg.senderName}]: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
        });
      }
    });
    
    // Simulate what happens when department tries to access user-department chat
    console.log(`\n🔍 What happens when department looks for user-department chat:`);
    const userDeptChat = await Chat.findOne({ 
      complaintId: complaint._id, 
      chatType: 'user-department' 
    });
    console.log(`   Found user-department chat: ${userDeptChat ? 'YES' : 'NO'}`);
    if (userDeptChat) {
      console.log(`   Messages in user-department: ${userDeptChat.messages?.length || 0}`);
    }
    
    // Simulate what happens when department tries to access admin-department chat
    console.log(`\n🔍 What happens when department looks for admin-department chat:`);
    const adminDeptChat = await Chat.findOne({ 
      complaintId: complaint._id, 
      chatType: 'admin-department' 
    });
    console.log(`   Found admin-department chat: ${adminDeptChat ? 'YES' : 'NO'}`);
    if (adminDeptChat) {
      console.log(`   Messages in admin-department: ${adminDeptChat.messages?.length || 0}`);
    }
    
    // Simulate what happens when admin looks for admin-department chat
    console.log(`\n🔍 What happens when admin looks for admin-department chat:`);
    // Admin always looks for admin-department, same as above
    console.log(`   Same as department admin lookup: ${adminDeptChat ? 'YES' : 'NO'}`);
    
    console.log("\n✅ Debug complete. Check the chat types and message counts above.");
    
    if (allChats.length > 0 && allChats.every(chat => chat.messages?.length === 0)) {
      console.log("\n⚠️  ISSUE FOUND: All chats exist but have 0 messages!");
      console.log("This suggests messages are being created but not saved properly.");
    }
    
    if (allChats.length === 0) {
      console.log("\n⚠️  ISSUE FOUND: No chats exist at all!");
      console.log("This suggests chat initialization is failing.");
    }
    
  } catch (error) {
    console.error("❌ Debug failed:", error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}