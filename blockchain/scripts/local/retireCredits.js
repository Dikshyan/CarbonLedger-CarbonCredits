import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const contractAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

    const contract = await ethers.getContractAt(
        "CarbonLedger",
        contractAddress
    );

    const amount = 500;

    const tx = await contract.retireCredits(2, amount);

    console.log("Transaction sent:", tx.hash);

    await tx.wait();

    console.log("Credits retired successfully!");

    const project = await contract.getProject(2);

    console.log("\nProject 2:");
    console.log("Minted:", project.mintedCredits.toString());
    console.log("Available:", project.availableCredits.toString());
    console.log("Retired:", project.retiredCredits.toString());
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});