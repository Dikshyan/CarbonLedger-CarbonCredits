import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const contractAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

    const contract = await ethers.getContractAt(
        "CarbonLedger",
        contractAddress
    );

    const tx = await contract.registerProject(
        "Green Earth NGO",
        "bafkreid43ylrdbixgfja2xwusbw44vi6itk6pe4tl3snznjubemweyb7ne"
    );

    console.log("Transaction sent:", tx.hash);

    await tx.wait();

    console.log("✅ Project registered successfully!");

    const project = await contract.getProject(1);

    console.log("Project ID:", project.projectId.toString());
    console.log("NGO:", project.NGOName);
    console.log("Project CID:", project.projectCID);
    console.log("Approved:", project.approved);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});