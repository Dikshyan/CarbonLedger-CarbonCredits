import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const contractAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

    const contract = await ethers.getContractAt(
        "CarbonLedger",
        contractAddress
    );

    const tx = await contract.approveProject(1);

    console.log("Transaction sent:", tx.hash);

    await tx.wait();

    console.log("Project approved successfully!");

    const approved = await contract.isProjectApproved(1);

    console.log("Project approved:", approved);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});