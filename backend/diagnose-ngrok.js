const { spawn } = require('child_process');
const path = require('path');

console.log('🔧 ngrok Diagnostic Tool\n');

// Function to run a command and capture output
function runCommand(command, args = []) {
    return new Promise((resolve) => {
        console.log(`Running: ${command} ${args.join(' ')}`);
        const process = spawn(command, args, { 
            shell: true, 
            stdio: ['pipe', 'pipe', 'pipe'] 
        });
        
        let output = '';
        let error = '';
        
        process.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        process.stderr.on('data', (data) => {
            error += data.toString();
        });
        
        process.on('close', (code) => {
            resolve({ code, output, error });
        });
        
        // Kill after 5 seconds for diagnostic commands
        setTimeout(() => {
            if (!process.killed) {
                process.kill();
                resolve({ code: -1, output: output + '\n[Timeout]', error });
            }
        }, 5000);
    });
}

async function diagnosengrok() {
    console.log('📋 Step 1: Checking ngrok installation...');
    
    const versionCheck = await runCommand('ngrok', ['version']);
    if (versionCheck.code === 0) {
        console.log('✅ ngrok is installed:');
        console.log(versionCheck.output.trim());
    } else {
        console.log('❌ ngrok not found or not working');
        console.log('Error:', versionCheck.error);
        console.log('\n💡 Solutions:');
        console.log('1. Reinstall ngrok: winget install ngrok.ngrok');
        console.log('2. Add ngrok to PATH manually');
        console.log('3. Download from: https://ngrok.com/download');
        return;
    }
    
    console.log('\n📋 Step 2: Checking ngrok configuration...');
    const configCheck = await runCommand('ngrok', ['config', 'check']);
    if (configCheck.code === 0) {
        console.log('✅ Configuration is valid');
    } else {
        console.log('⚠️  Configuration issue:');
        console.log(configCheck.output || configCheck.error);
    }
    
    console.log('\n📋 Step 3: Testing ngrok authtoken...');
    const authCheck = await runCommand('ngrok', ['diagnose']);
    console.log('Auth status:', authCheck.output || authCheck.error);
    
    console.log('\n📋 Step 4: Starting ngrok tunnel (5 second test)...');
    const tunnelTest = await runCommand('ngrok', ['http', '5000', '--log', 'stdout']);
    
    if (tunnelTest.output.includes('https://')) {
        // Extract HTTPS URL
        const httpsMatch = tunnelTest.output.match(/https:\/\/[^\s]+/);
        if (httpsMatch) {
            console.log('✅ ngrok is working! HTTPS URL found:');
            console.log('🔗', httpsMatch[0]);
            
            // Update .env file automatically
            const fs = require('fs');
            const envPath = path.join(__dirname, '.env');
            
            try {
                let envContent = fs.readFileSync(envPath, 'utf8');
                envContent = envContent.replace(
                    /TWILIO_WEBHOOK_BASE_URL=.*/,
                    `TWILIO_WEBHOOK_BASE_URL=${httpsMatch[0]}`
                );
                fs.writeFileSync(envPath, envContent);
                console.log('✅ Updated .env file with ngrok URL');
            } catch (error) {
                console.log('⚠️  Could not update .env file automatically');
                console.log('Please manually update TWILIO_WEBHOOK_BASE_URL to:', httpsMatch[0]);
            }
        }
    } else {
        console.log('❌ ngrok tunnel failed');
        console.log('Output:', tunnelTest.output);
        console.log('Error:', tunnelTest.error);
        
        console.log('\n🔧 Troubleshooting suggestions:');
        console.log('1. Get authtoken from: https://dashboard.ngrok.com/get-started/setup');
        console.log('2. Run: ngrok config add-authtoken YOUR_TOKEN');
        console.log('3. Or try alternative: npm install -g localtunnel && lt --port 5000');
    }
    
    console.log('\n📋 Diagnostic complete!');
}

diagnosengrok().catch(console.error);