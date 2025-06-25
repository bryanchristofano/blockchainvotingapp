let provider;
let signer;
let contract;
let accounts = [];
let currentAccount = '';
let votingOpen = false;

const contractAddress = "0xfc6680018353206c54c72386d999888bb91b4d57"; // GANTI sesuai kontrakmu
const abi = [
	{
		"inputs": [],
		"name": "closeVoting",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "to",
				"type": "address"
			}
		],
		"name": "delegate",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "voter",
				"type": "address"
			}
		],
		"name": "giveRightToVote",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "openVoting",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string[]",
				"name": "proposalNames",
				"type": "string[]"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "proposal",
				"type": "uint256"
			}
		],
		"name": "vote",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "chairperson",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getAllProposals",
		"outputs": [
			{
				"internalType": "string[]",
				"name": "names",
				"type": "string[]"
			},
			{
				"internalType": "uint256[]",
				"name": "voteCounts",
				"type": "uint256[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "isVotingOpen",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "proposals",
		"outputs": [
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "voteCount",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "voters",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "weight",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "voted",
				"type": "bool"
			},
			{
				"internalType": "address",
				"name": "delegate",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "vote",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "winnerName",
		"outputs": [
			{
				"internalType": "string",
				"name": "winnerName_",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "winningProposal",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "winningProposal_",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

async function connectWallet() {
  try {
    if (!window.ethereum) {
      alert('MetaMask is not installed!');
      return;
    }

    // Request account access
    accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    if (accounts.length === 0) {
      alert('No accounts found. Please check your MetaMask.');
      return;
    }

    provider = new ethers.providers.Web3Provider(window.ethereum);
    
    // Show account selector
    populateAccountSelector();
    
    // Set first account as default
    currentAccount = accounts[0];
    updateCurrentAccount();
    
    // Initialize contract
    await initializeContract();
    
    // Update UI
    document.getElementById('connectBtn').textContent = '✅ Connected';
    document.getElementById('connectBtn').disabled = true;
    
    // Check if current account is chairperson
    await checkIfChairperson();
    
    // Update voting status
    await updateVotingStatus();
    
    // Load proposals
    await getAllProposals();
    
    alert('✅ Wallet connected successfully!');
    
  } catch (error) {
    console.error('Connection failed:', error);
    alert('Connection failed: ' + error.message);
  }
}

function populateAccountSelector() {
  const selector = document.getElementById('accountSelector');
  selector.innerHTML = '<option value="">Select Account...</option>';
  
  accounts.forEach((account, index) => {
    const option = document.createElement('option');
    option.value = account;
    option.textContent = `Account ${index + 1}: ${account.substring(0, 6)}...${account.substring(38)}`;
    selector.appendChild(option);
  });
  
  selector.style.display = 'block';
  selector.value = currentAccount;
}

function updateCurrentAccount() {
  const currentAccountDiv = document.getElementById('currentAccount');
  const statusDiv = document.getElementById('status');
  
  currentAccountDiv.textContent = `Current: ${currentAccount}`;
  currentAccountDiv.style.display = 'block';
  
  // Update status as well
  if (statusDiv) {
    statusDiv.textContent = `Wallet connected: ${currentAccount}`;
  }
}

async function switchAccount() {
  const selector = document.getElementById('accountSelector');
  const selectedAccount = selector.value;
  
  if (selectedAccount && selectedAccount !== currentAccount) {
    currentAccount = selectedAccount;
    updateCurrentAccount();
    
    // Reinitialize contract with new signer
    await initializeContract();
    
    // Update UI based on new account
    await checkIfChairperson();
    await updateVotingStatus();
    await getAllProposals();
    
    alert(`✅ Switched to account: ${currentAccount}`);
  }
}

async function initializeContract() {
  signer = provider.getSigner(currentAccount);
  contract = new ethers.Contract(contractAddress, abi, signer);
}

async function updateVotingStatus() {
  try {
    if (!contract) return;
    
    votingOpen = await contract.isVotingOpen();
    const statusElement = document.getElementById("votingStatus");
    const votingSection = document.getElementById('votingSection');
    const disabledNotice = document.getElementById('votingDisabledNotice');
    
    if (votingOpen) {
      statusElement.textContent = "Voting Status: 🟢 OPEN";
      statusElement.className = 'voting-open';
      votingSection.classList.remove('disabled');
      disabledNotice.style.display = 'none';
    } else {
      statusElement.textContent = "Voting Status: 🔴 CLOSED";
      statusElement.className = 'voting-closed';
      votingSection.classList.add('disabled');
      disabledNotice.style.display = 'block';
    }
    
    // Enable/disable voting buttons based on status
    const votingButtons = document.querySelectorAll('.voting-action');
    votingButtons.forEach(btn => {
      btn.disabled = !votingOpen;
    });
    
  } catch (err) {
    console.error("Error updating voting status:", err);
    document.getElementById("votingStatus").textContent = "Voting Status: Error";
  }
}

async function checkIfChairperson() {
  try {
    if (!contract) return;
    
    const chairperson = await contract.chairperson();
    const isChairperson = chairperson.toLowerCase() === currentAccount.toLowerCase();
    
    const chairpersonControls = document.getElementById("chairpersonControls");
    const chairpersonInfo = document.getElementById("chairpersonInfo");
    
    if (isChairperson) {
      chairpersonControls.style.display = "block";
      chairpersonInfo.textContent = `✅ You are the Chairperson (${currentAccount})`;
    } else {
      chairpersonControls.style.display = "none";
      chairpersonInfo.textContent = "";
    }
  } catch (err) {
    console.error("Error checking chairperson:", err);
  }
}

async function openVoting() {
  try {
    const tx = await contract.openVoting();
    alert("🟢 Opening voting... Transaction hash: " + tx.hash);
    await tx.wait();
    alert("✅ Voting has been opened!");
    await updateVotingStatus();
  } catch (err) {
    console.error("Error opening voting:", err);
    alert("❌ Failed to open voting: " + err.message);
  }
}

async function closeVoting() {
  try {
    const tx = await contract.closeVoting();
    alert("🔴 Closing voting... Transaction hash: " + tx.hash);
    await tx.wait();
    alert("✅ Voting has been closed!");
    await updateVotingStatus();
  } catch (err) {
    console.error("Error closing voting:", err);
    alert("❌ Failed to close voting: " + err.message);
  }
}

async function giveRightToVote() {
  const address = document.getElementById("voterAddress").value;
  if (!address || !ethers.utils.isAddress(address)) {
    alert("Please enter a valid voter address");
    return;
  }
  
  try {
    const tx = await contract.giveRightToVote(address);
    alert("🎫 Granting voting rights... Transaction hash: " + tx.hash);
    await tx.wait();
    alert(`✅ Hak memilih diberikan ke: ${address}`);
    document.getElementById("voterAddress").value = "";
  } catch (err) {
    console.error("Error granting voting rights:", err);
    alert("❌ Gagal memberikan hak memilih: " + err.message);
  }
}

async function vote() {
  if (!votingOpen) {
    alert('❌ Voting is currently closed!');
    return;
  }
  
  const proposal = document.getElementById("proposalId").value;
  if (proposal === "") {
    alert("Please select a proposal");
    return;
  }
  
  try {
    const tx = await contract.vote(parseInt(proposal));
    alert("🗳️ Vote submitted! Transaction hash: " + tx.hash);
    await tx.wait();
    alert(`✅ Berhasil memilih proposal ${proposal}`);
    await getAllProposals(); // Refresh proposal list
  } catch (err) {
    console.error("Error voting:", err);
    alert("❌ Gagal voting: " + err.message);
  }
}

async function delegateVote() {
  if (!votingOpen) {
    alert('❌ Voting is currently closed!');
    return;
  }
  
  const to = document.getElementById("delegateTo").value;
  if (!to || !ethers.utils.isAddress(to)) {
    alert("Please enter a valid delegate address");
    return;
  }
  
  try {
    const tx = await contract.delegate(to);
    alert("📨 Delegation submitted! Transaction hash: " + tx.hash);
    await tx.wait();
    alert(`✅ Delegasi suara ke: ${to}`);
    document.getElementById("delegateTo").value = "";
  } catch (err) {
    console.error("Error delegating:", err);
    alert("❌ Gagal delegasi: " + err.message);
  }
}

async function getWinner() {
  try {
    if (!contract) {
      alert('Please connect your wallet first');
      return;
    }
    
    const name = await contract.winnerName();
    const index = await contract.winningProposal();
    document.getElementById("winner").innerHTML = `
      <strong>🏆 Proposal Menang:</strong> ${name}<br>
      <strong>Proposal ID:</strong> ${index}
    `;
  } catch (err) {
    console.error("Error getting winner:", err);
    document.getElementById("winner").innerHTML = "❌ Gagal ambil pemenang: " + err.message;
  }
}

async function getProposal() {
  const index = document.getElementById("proposalIndex").value;
  if (index === "") {
    alert("Please enter a proposal index");
    return;
  }
  
  try {
    if (!contract) {
      alert('Please connect your wallet first');
      return;
    }
    
    const proposal = await contract.proposals(parseInt(index));
    document.getElementById("proposalInfo").innerHTML = `
      <strong>📊 Proposal ID ${index}:</strong> "${proposal.name}"<br>
      <strong>Vote Count:</strong> ${proposal.voteCount}
    `;
  } catch (err) {
    console.error("Error getting proposal:", err);
    document.getElementById("proposalInfo").innerHTML = "❌ Proposal tidak ditemukan";
  }
}

async function getVoter() {
  const addr = document.getElementById("voterLookup").value;
  if (!addr || !ethers.utils.isAddress(addr)) {
    alert("Please enter a valid voter address");
    return;
  }
  
  try {
    if (!contract) {
      alert('Please connect your wallet first');
      return;
    }
    
    const voter = await contract.voters(addr);
    const delegateDisplay = voter.delegate === "0x0000000000000000000000000000000000000000" ? "None" : voter.delegate;
    const votedStatus = voter.voted ? "✅ Yes" : "❌ No";
    const statusClass = voter.voted ? "status-voted" : "status-not-voted";
    
    document.getElementById("voterInfo").innerHTML = `
      <div class="voter-info-item">
        <span class="voter-info-label">Address:</span>
        <div class="address-display">${addr}</div>
      </div>
      
      <div class="voter-info-item">
        <span class="voter-info-label">👤 Weight:</span>
        <span class="voter-info-value">${voter.weight}</span>
      </div>
      
      <div class="voter-info-item">
        <span class="voter-info-label">Voted:</span>
        <span class="status-badge ${statusClass}">${votedStatus}</span>
      </div>
      
      <div class="voter-info-item">
        <span class="voter-info-label">Delegate:</span>
        ${delegateDisplay === "None" ? 
          '<span class="voter-info-value">None</span>' : 
          `<div class="address-display">${delegateDisplay}</div>`
        }
      </div>
      
      <div class="voter-info-item">
        <span class="voter-info-label">Vote:</span>
        <span class="voter-info-value">${voter.voted ? voter.vote : "N/A"}</span>
      </div>
    `;
  } catch (err) {
    console.error("Error getting voter:", err);
    document.getElementById("voterInfo").innerHTML = "❌ Voter tidak ditemukan";
  }
}

async function getAllProposals() {
  try {
    if (!contract) {
      alert('Please connect your wallet first');
      return;
    }
    
    const result = await contract.getAllProposals();
    const names = result.names || result[0];
    const voteCounts = result.voteCounts || result[1];
    
    let proposalsHTML = "<h4>📋 All Proposals:</h4>";
    proposalsHTML += "<div class='proposals-list'>";
    
    for (let i = 0; i < names.length; i++) {
      proposalsHTML += `
        <div class="proposal-item">
          <strong>ID ${i}:</strong> ${names[i]} 
          <span class="vote-count">(${voteCounts[i]} votes)</span>
        </div>
      `;
    }
    
    proposalsHTML += "</div>";
    document.getElementById("allProposals").innerHTML = proposalsHTML;
    
    // Update proposal select dropdown
    updateProposalSelect(names);
    
  } catch (err) {
    console.error("Error getting all proposals:", err);
    document.getElementById("allProposals").innerHTML = "❌ Gagal mengambil daftar proposal";
  }
}

function updateProposalSelect(names) {
  const select = document.getElementById("proposalId");
  select.innerHTML = '<option value="">Select a proposal...</option>';
  
  names.forEach((name, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${index}: ${name}`;
    select.appendChild(option);
  });
}

// Listen for account changes in MetaMask
if (window.ethereum) {
  window.ethereum.on('accountsChanged', function (newAccounts) {
    if (newAccounts.length === 0) {
      // User disconnected wallet
      location.reload();
    } else {
      // Update accounts list
      accounts = newAccounts;
      if (newAccounts.includes(currentAccount)) {
        // Current account still available
      } else {
        // Current account was removed, switch to first available
        currentAccount = newAccounts[0];
        populateAccountSelector();
        updateCurrentAccount();
        initializeContract();
        checkIfChairperson();
        updateVotingStatus();
        getAllProposals();
      }
    }
  });

  // Listen for network changes
  window.ethereum.on('chainChanged', function (chainId) {
    location.reload();
  });
}

// Auto-refresh functions
setInterval(async () => {
  if (contract) {
    await updateVotingStatus();
  }
}, 10000); // Update every 10 seconds