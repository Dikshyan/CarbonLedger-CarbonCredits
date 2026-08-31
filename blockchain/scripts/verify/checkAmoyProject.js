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

    const project = await contract.getProject(1);

    console.log("\nProject 1");
    console.log("Project ID:", project.projectId.toString());
    console.log("NGO:", project.NGOName);
    console.log("Owner:", project.owner);
    console.log("Project CID:", project.projectCID);
    console.log("Approved:", project.approved);
    console.log("MRV CID:", project.mrvCID);
    console.log("MRV Approved:", project.mrvApproved);
    console.log("Minted Credits:", project.mintedCredits.toString());
    console.log("Available Credits:", project.availableCredits.toString());
    console.log("Retired Credits:", project.retiredCredits.toString());
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});