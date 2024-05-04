const { ethers, JsonRpcProvider } = require('ethers');
require('dotenv').config();

async function main() {

    const url = process.env.ALCHEMY_TESTNET_RPC_URL;

    let artifacts = await hre.artifacts.readArtifact("Event");

    const provider = new JsonRpcProvider(url);

    let privateKey = process.env.ALCHEMY_TESTNET_PRIVATE_KEY;

    let wallet = new ethers.Wallet(privateKey, provider);

    // Create an instance of a Faucet Factory
    let factory = new ethers.ContractFactory(artifacts.abi, artifacts.bytecode, wallet);

    let event = await factory.deploy(
        "First Event",
        "This is a description field content",
        "1714553516",
        ethers.parseUnits("1000000000000", "ether"));

    console.log(event);
    console.log("Faucet address:", event.target);

    await event.waitForDeployment();
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });