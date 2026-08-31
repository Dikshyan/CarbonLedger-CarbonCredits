import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const contractAddress =
        "0xeCeAD32dA3F76369B78D71EaaEcB4dd73322B6Ee";

    const contract = await ethers.getContractAt(
        "CarbonLedger",
        contractAddress
    );

    const amount = 1000;

    console.log("Transferring carbon credits...");
    console.log("From Project: 1");
    console.log("To Project:   2");
    console.log("Amount:", amount);

    const tx = await contract.transferCredits(
        1,
        2,
        amount
    );

    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();

    console.log("Transaction confirmed!");
    console.log("Block:", receipt.blockNumber);

    const project1 = await contract.getProject(1);
    const project2 = await contract.getProject(2);

    console.log("\nProject 1:");
    console.log("Available:", project1.availableCredits.toString());
    console.log("Retired:", project1.retiredCredits.toString());

    console.log("\nProject 2:");
    console.log("Available:", project2.availableCredits.toString());
    console.log("Retired:", project2.retiredCredits.toString());
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});