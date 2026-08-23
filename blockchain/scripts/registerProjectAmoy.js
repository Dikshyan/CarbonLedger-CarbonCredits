import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const contractAddress =
        "0xeCeAD32dA3F76369B78D71EaaEcB4dd73322B6Ee";

    const contract = await ethers.getContractAt(
        "CarbonLedger",
        contractAddress
    );

    const ngoName = "Green Earth NGO";

    const projectCID =
        "bafkreid43ylrdbixgfja2xwusbw44vi6itk6pe4tl3snznjubemweyb7ne";

    console.log("Registering project...");
    console.log("NGO:", ngoName);
    console.log("Project CID:", projectCID);

    const tx = await contract.registerProject(
        ngoName,
        projectCID
    );

    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();

    console.log("Transaction confirmed!");
    console.log("Block:", receipt.blockNumber);

    const project = await contract.getProject(1);

    console.log("\nProject Details:");
    console.log("Project ID:", project.projectId.toString());
    console.log("NGO:", project.NGOName);
    console.log("Owner:", project.owner);
    console.log("Project CID:", project.projectCID);
    console.log("Approved:", project.approved);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
