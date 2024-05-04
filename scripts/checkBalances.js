// add the game address here and update the contract name if necessary
const { JsonRpcProvider, parseEther } = require('ethers');

const contractAddr = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const contractName = "Event";

async function main() {
    const url = process.env.TESTNET_RPC_URL_LOCAL;
    const provider = new JsonRpcProvider(url);

    const event = await hre.ethers.getContractAt(contractName, contractAddr);
    const [owner, user1, user2, user3, user4] = await ethers.getSigners();

    console.log("balanceContractETH: ", ethers.formatEther((await provider.getBalance(event.getAddress())).toString()));
    console.log("balance0ETH: ", (await provider.getBalance(owner.address)).toString());
    console.log("balance1ETH: ", (await provider.getBalance(user1.address)).toString());
    console.log("balance2ETH: ", (await provider.getBalance(user2.address)).toString());
    console.log("balance3ETH: ", (await provider.getBalance(user3.address)).toString());
    console.log("balance4ETH: ", (await provider.getBalance(user4.address)).toString());
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
