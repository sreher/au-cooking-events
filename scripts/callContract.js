const hre = require("hardhat");

// add the game address here and update the contract name if necessary
const { JsonRpcProvider, parseEther} = require('ethers');

// const contractAddr = "0x70A9f47AD322e576FB36C367826471843aAF648C";
const contractAddr = "0xc6481c5489cf44E91BD7775B8A3b903D81f3c8e9";
const contractName = "Event";

async function main() {
    const url = process.env.TESTNET_RPC_URL_LOCAL;
    const provider = new JsonRpcProvider(url);
    const signer = new ethers.Wallet(process.env.TESTNET_PRIVATE_KEY_LOCAL, provider);

    // const event = await hre.ethers.getContractAt(contractName, contractAddr);
    const MyContract = await ethers.getContractFactory(contractName);
    const event = MyContract.attach(
        contractAddr
    );

    const [owner, user1, user2, user3, user4] = await ethers.getSigners();

    // let balance = await provider.getBalance(contractAddr);
    // console.log(ethers.formatEther(balance));
    // const tx = await user1.sendTransaction({
    //     to: contractAddr,
    //     value: parseEther("1.0"),
    // });
    // console.log(tx);

    let data = await event.connect(owner).title();
    console.log("Event before: ", data);
    // const tx = await event.connect(user4).joinEvent(
    //     "John",
    //     "Smith",
    //     "smith@reher.hostingkunde.de",
    //     "+49 176 1231242341",
    //     8,
    //     { value: parseEther("1.0") }
    // );
    // console.log("Event after: ", await event.participantCount());
    // console.log(tx);

    // balance = await provider.getBalance(contractAddr);
    // console.log(ethers.formatEther(balance));

    // const tx = await contract.setX(20);
    // const tx = await contract.wait();
    // const tx = await contract.giveMeAllowance(20000);
    // await tx.wait();
    // const tx = await contract.win();

    // if you did, it will be in both the logs and events array
    // const receipt = await tx.wait();
    // console.log("participantCount: ", await event.participantCount());
    // console.log("Event Balances: ", await contract.balances());
    // console.log("Event Balances: ", await contract.balanceOf("90F79bf6EB2c4f870365E785982E1f101E93b906"));
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
