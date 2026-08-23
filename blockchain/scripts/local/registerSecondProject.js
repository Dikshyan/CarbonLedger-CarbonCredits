import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const contractAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

    const contract = await ethers.getContractAt(
        "CarbonLedger",
        contractAddress
    );

    const tx = await contract.registerProject(
        "Second Test NGO",
        "bafkreid43ylrdbixgfja2xwusbw44vi6itk6pe4tl3snznjubemweyb7ne"
    );

    console.log("Transaction sent:", tx.hash);

    await tx.wait();

    console.log("Second project registered!");

    const project = await contract.getProject(2);

    console.log("Project ID:", project.projectId.toString());
    console.log("NGO:", project.NGOName);
    console.log("Approved:", project.approved);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});