import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const contractAddress =
        "0xeCeAD32dA3F76369B78D71EaaEcB4dd73322B6Ee";

    const contract = await ethers.getContractAt(
        "CarbonLedger",
        contractAddress
    );

    console.log("Approving MRV for Project 1...");

    const tx = await contract.approveMRV(1);

    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();

    console.log("Transaction confirmed!");
    console.log("Block:", receipt.blockNumber);

    const approved = await contract.isMRVApproved(1);

    console.log("MRV approved:", approved);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});