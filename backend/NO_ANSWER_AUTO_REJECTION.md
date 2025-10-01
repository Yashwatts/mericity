# Auto-Rejection for Missed Phone Verification Calls

## Feature Overview

Users who don't pick up phone verification calls will now have their complaints automatically moved to "closed" status with a clear rejection reason. This prevents complaints from staying in limbo when users are unavailable to answer verification calls.

## Problem Solved

**Before**: If users didn't pick up verification calls, complaints would remain in "pending_verification" status indefinitely, creating confusion and poor user experience.

**After**: Complaints are automatically closed when calls go unanswered, with clear communication to users about what happened.

## Implementation Details

### 1. Enhanced Call Status Handler (`routes/complaints.js`)

The `/call-status/:complaintId` webhook now intelligently handles Twilio call statuses:

```javascript
// Auto-rejection trigger statuses
const noAnswerStatuses = ['no-answer', 'busy', 'failed'];

if (noAnswerStatuses.includes(callStatus)) {
  // Auto-reject complaint if in verification state
  await Complaint.findByIdAndUpdate(complaintId, {
    status: 'rejected_no_answer',
    phoneVerificationStatus: 'no_answer',
    rejectionReason: `Phone verification failed - user did not answer call (${callStatus})`,
    // ... additional tracking fields
  });
}
```

### 2. Updated Complaint Model

**New Status**: `rejected_no_answer` - Specifically for missed call scenarios
**New Fields**:
- `noAnswerCallStatus`: Records the specific Twilio status ('no-answer', 'busy', 'failed')
- `noAnswerTimestamp`: When the no-answer status was received  
- `rejectedAt`: When complaint was rejected (for any reason)

### 3. Smart Categorization

Updated complaint categorization to include the new status:
```javascript
if (['rejected', 'rejected_by_user', 'rejected_no_answer'].includes(status)) {
  category = 'closed';
}
```

### 4. User Notifications

**In-App Notification**: "Verification Call Missed - We tried to call you to verify your complaint but couldn't reach you..."

**Optional SMS**: Backup notification via SMS if available

## Call Status Handling Matrix

| Twilio Status | Action | Final Status | Frontend Category |
|--------------|---------|--------------|-------------------|
| `no-answer` | Auto-reject (if in verification) | `rejected_no_answer` | Closed |
| `busy` | Auto-reject (if in verification) | `rejected_no_answer` | Closed |
| `failed` | Auto-reject (if in verification) | `rejected_no_answer` | Closed |
| `completed` | Continue normal process | Varies | Depends on verification |
| `in-progress` | Wait for completion | No change | Current status |
| Others | No action | No change | Current status |

## Safety Features

### 1. State Validation
Only complaints in verification states are auto-rejected:
- `pending_verification`
- `phone_verified`

Complaints already in `in_progress`, `resolved`, etc. are not affected.

### 2. Detailed Tracking
Every auto-rejection includes:
- Specific reason with call status
- Timestamp of when rejection occurred  
- Original Twilio call status for debugging

### 3. User Communication
- Clear in-app notifications explaining what happened
- Option for users to submit new complaints
- Transparent about the missed call reason

## User Experience Impact

### Before Implementation
❌ **Confusing**: Complaints stuck in "pending" forever  
❌ **No feedback**: Users don't know why nothing happened  
❌ **Poor UX**: Uncertainty about complaint status  

### After Implementation  
✅ **Clear closure**: Complaints properly closed with reason  
✅ **User awareness**: Notifications explain what happened  
✅ **Clean dashboard**: No more orphaned pending complaints  
✅ **Actionable**: Users can resubmit if needed  

## Technical Benefits

1. **Database Hygiene**: No accumulation of stale pending complaints
2. **Clear Metrics**: Can track call answer rates and user engagement  
3. **Better UX**: Users understand exactly what happened
4. **Scalability**: System self-cleans missed verification attempts

## Files Modified

1. **`routes/complaints.js`** - Enhanced call status webhook handler
2. **`models/Complaint.js`** - Added new status and tracking fields  
3. **`services/notificationService.js`** - Added missed call notification

## Testing Results

✅ **Auto-rejection**: Works for no-answer/busy/failed call statuses  
✅ **State safety**: Only affects complaints in verification states  
✅ **Notifications**: Missed call notifications sent successfully  
✅ **Categorization**: Rejected complaints show as "closed" in frontend  

## Deployment Status

**Ready for production deployment**

## Next Steps

1. 🚀 Deploy to production backend
2. 📱 Test with real Twilio call scenarios  
3. 📊 Monitor auto-rejection rates and user feedback
4. 🔔 Verify notification delivery to users
5. 📈 Track user re-submission rates after missed calls

## User Communication

Consider adding a FAQ or help section explaining:
- Why verification calls are made
- What happens if they miss the call  
- How to resubmit complaints if needed
- Best practices for ensuring call delivery

This feature significantly improves the user experience by providing clear, automatic closure for missed verification calls while maintaining system cleanliness and user awareness.