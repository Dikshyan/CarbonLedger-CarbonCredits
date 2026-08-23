import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const contractAddress =
        "0xeCeAD32dA3F76369B78D71EaaEcB4dd73322B6Ee";

    const contract = await ethers.getContractAt(
        "CarbonLedger",
        contractAddress
    );

    console.log("Contract:", contractAddress);

    console.log(
        "Admin:",
        await contract.admin()
    );

    console.log(
        "Verifier:",
        await contract.verifier()
    );

    console.log(
        "Next Project ID:",
        (await contract.nextProjectId()).toString()
    );
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});