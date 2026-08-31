import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const contractAddress =
        "0xeCeAD32dA3F76369B78D71EaaEcB4dd73322B6Ee";

    const contract = await ethers.getContractAt(
        "CarbonLedger",
        contractAddress
    );

    const ngoName = "Second Test NGO";

    // Using the same real Project Report CID only for lifecycle testing.
    const projectCID =
        "bafkreid43ylrdbixgfja2xwusbw44vi6itk6pe4tl3snznjubemweyb7ne";

    console.log("Registering Project 2...");

    const tx = await contract.registerProject(
        ngoName,
        projectCID
    );

    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();

    console.log("Transaction confirmed!");
    console.log("Block:", receipt.blockNumber);

    const project = await contract.getProject(2);

    console.log("\nProject 2:");
    console.log("Project ID:", project.projectId.toString());
    console.log("NGO:", project.NGOName);
    console.log("Owner:", project.owner);
    console.log("Approved:", project.approved);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});