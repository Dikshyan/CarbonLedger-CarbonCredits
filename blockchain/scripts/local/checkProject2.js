import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const contractAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

    const contract = await ethers.getContractAt(
        "CarbonLedger",
        contractAddress
    );

    console.log("Contract:", contractAddress);

    console.log(
        "Approved:",
        await contract.isProjectApproved(2)
    );

    console.log(
        "Minted:",
        (await contract.getMintedCredits(2)).toString()
    );

    console.log(
        "Available:",
        (await contract.getAvailableCredits(2)).toString()
    );

    console.log(
        "Retired:",
        (await contract.getRetiredCredits(2)).toString()
    );
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
