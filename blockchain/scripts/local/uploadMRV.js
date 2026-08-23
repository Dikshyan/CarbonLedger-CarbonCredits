import hre from "hardhat";

async function main() {
    const { ethers } = await hre.network.connect();

    const contractAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

    const contract = await ethers.getContractAt(
        "CarbonLedger",
        contractAddress
    );

    const mrvCID =
        "bafkreig5mhmjg7cntgtx6haqefngcwqwfc7hmwoisg76vmceu46nf3jmaa";

    const tx = await contract.uploadMRV(1, mrvCID);

    console.log("Transaction sent:", tx.hash);

    await tx.wait();

    console.log("MRV uploaded successfully!");

    const storedCID = await contract.getMRVCID(1);

    console.log("Stored MRV CID:", storedCID);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});