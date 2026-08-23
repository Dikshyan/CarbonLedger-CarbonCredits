import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const contractAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
    

    const contract = await ethers.getContractAt(
        "CarbonLedger",
        contractAddress
    );

    const amount = 1000;

    const tx = await contract.transferCredits(
        1,       // from Project 1
        2,       // to Project 2
        amount
    );

    console.log("Transaction sent:", tx.hash);

    await tx.wait();

    console.log("Credits transferred successfully!");

    const project1 = await contract.getProject(1);
    const project2 = await contract.getProject(2);

    console.log("\nProject 1:");
    console.log("Minted:", project1.mintedCredits.toString());
    console.log("Available:", project1.availableCredits.toString());
    console.log("Retired:", project1.retiredCredits.toString());

    console.log("\nProject 2:");
    console.log("Minted:", project2.mintedCredits.toString());
    console.log("Available:", project2.availableCredits.toString());
    console.log("Retired:", project2.retiredCredits.toString());
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});