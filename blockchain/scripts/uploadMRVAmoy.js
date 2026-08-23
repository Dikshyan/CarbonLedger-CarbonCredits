import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const contractAddress =
        "0xeCeAD32dA3F76369B78D71EaaEcB4dd73322B6Ee";

    const contract = await ethers.getContractAt(
        "CarbonLedger",
        contractAddress
    );

    const mrvCID =
        "bafkreig5mhmjg7cntgtx6haqefngcwqwfc7hmwoisg76vmceu46nf3jmaa";

    console.log("Uploading MRV CID...");
    console.log("Project ID: 1");
    console.log("MRV CID:", mrvCID);

    const tx = await contract.uploadMRV(1, mrvCID);

    console.log("Transaction sent:", tx.hash);

    const receipt = await tx.wait();

    console.log("Transaction confirmed!");
    console.log("Block:", receipt.blockNumber);

    const storedCID = await contract.getMRVCID(1);

    console.log("\nStored MRV CID:");
    console.log(storedCID);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
