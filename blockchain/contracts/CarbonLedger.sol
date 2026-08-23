// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract CarbonLedger  {
   
    struct Project {
    uint256 projectId;
    string NGOName;
    bool approved;
    address owner;

    string projectCID;
    string mrvCID;
 
    bool mrvApproved;

    uint256 mintedCredits;
    uint256 availableCredits;
    uint256 retiredCredits;

    uint256 createdAt;
    uint256 updatedAt;
    }

  
    mapping(uint256 => Project) public projects;

    modifier projectExists(uint256 projectId) {
    require(
        projects[projectId].owner != address(0),
        "Project does not exist"
    );
    _;
    }

    address public admin;

    address public verifier;

    uint256 public nextProjectId = 1;

    
    event ProjectRegistered(uint256 indexed projectId, address indexed owner, string ngoName);
    event ProjectApproved(uint256 indexed projectId);
    event MRVUploaded(uint256 indexed projectId, string cid);
    event MRVApproved(uint256 indexed projectId);
    event CreditsMinted(uint256 indexed projectId, uint256 amount);
    event CreditsTransferred(uint256 indexed fromProjectId, uint256 indexed toProjectId, uint256 amount);
    event CreditsRetired(uint256 indexed projectId, uint256 amount);
    event VerifierChanged(address indexed oldVerifier, address indexed newVerifier);

    
    modifier onlyOwner() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    
    modifier onlyVerifier() {
        require(msg.sender == verifier, "Only verifier can call this function");
        _;
    }


    constructor(address _verifier) {
    require(_verifier != address(0), "Invalid verifier");

    admin = msg.sender;
    verifier = _verifier;
    }

    
    function registerProject(
    string memory ngoName,
    string memory projectCID
        )
    external {
    require(bytes(ngoName).length > 0, "NGO name required");
    
    require(bytes(projectCID).length > 0, "Project CID required");
    uint256 projectId = nextProjectId;
    nextProjectId++;

    projects[projectId] = Project({
    projectId: projectId,
    NGOName: ngoName,
    approved: false,
    owner: msg.sender,
    projectCID: projectCID,
    mrvCID: "",
    mrvApproved: false,
    mintedCredits: 0,
    availableCredits: 0,
    retiredCredits: 0,
    createdAt: block.timestamp,
    updatedAt: block.timestamp
    });

    emit ProjectRegistered(projectId, msg.sender, ngoName);
    }

  
    function approveProject(uint256 projectId) external onlyVerifier projectExists(projectId) {
       require(!projects[projectId].approved, "Project already approved");
       projects[projectId].approved = true;
        projects[projectId].updatedAt = block.timestamp;
        emit ProjectApproved(projectId);
    }

   
    function uploadMRV(uint256 projectId, string memory cid) external projectExists(projectId) {
        Project storage project = projects[projectId];
        require(bytes(cid).length > 0, "Invalid MRV CID");

        require(msg.sender == project.owner, "Only project owner can upload MRV");
        require(project.approved, "Project is not approved yet");

        project.mrvCID = cid;
        project.updatedAt = block.timestamp;
        project.mrvApproved = false;

        emit MRVUploaded(projectId, cid);
    }

  
    function approveMRV(uint256 projectId) 
    external 
    onlyVerifier 
    projectExists(projectId) 
    {
        Project storage project = projects[projectId];
        require(!project.mrvApproved, "MRV already approved"); 
        require(bytes(project.mrvCID).length > 0, "MRV CID not uploaded");

        project.mrvApproved = true;
        project.updatedAt = block.timestamp;

        emit MRVApproved(projectId);
    }

    
    function mintCarbonCredits(uint256 projectId, uint256 amount) external onlyVerifier projectExists(projectId) {
        Project storage project = projects[projectId];

        require(project.approved, "Project is not approved");
        require(project.mrvApproved, "MRV is not approved");
        require(amount > 0, "Amount must be greater than zero");

        project.mintedCredits += amount;
        project.availableCredits += amount;
        project.updatedAt = block.timestamp;

        emit CreditsMinted(projectId, amount);
    }

    
    function transferCredits(uint256 fromProjectId, uint256 toProjectId, uint256 amount)
        external
        projectExists(fromProjectId)
        projectExists(toProjectId)
    {
        Project storage fromProject = projects[fromProjectId];
        Project storage toProject = projects[toProjectId];
        require(toProject.approved, "Destination project not approved");
        require(amount > 0, "Amount must be greater than zero");
        require(fromProjectId != toProjectId, "Cannot transfer to same project");
        require(msg.sender == fromProject.owner, "Only source project owner can transfer");
       require(fromProject.availableCredits >= amount, "Insufficient carbon credits");

        fromProject.availableCredits -= amount;
        toProject.availableCredits += amount;
        fromProject.updatedAt = block.timestamp;
        toProject.updatedAt = block.timestamp;

        emit CreditsTransferred(fromProjectId, toProjectId, amount);
    }

    
    function retireCredits(uint256 projectId, uint256 amount) external projectExists(projectId) {
        Project storage project = projects[projectId];
        require(amount > 0, "Amount must be greater than zero");
        require(msg.sender == project.owner, "Only project owner can retire credits");
        require(project.availableCredits >= amount, "Insufficient carbon credits");

        project.availableCredits -= amount;
        project.retiredCredits += amount;
        project.updatedAt = block.timestamp;

        emit CreditsRetired(projectId, amount);
    }

   
    function getProject(uint256 projectId) 
    external 
    view 
    projectExists(projectId) 
    returns (Project memory) {
        return projects[projectId];
    }


    function isProjectApproved(uint256 projectId) external view projectExists(projectId) returns (bool) {
        return projects[projectId].approved;
    }


    function isMRVApproved(uint256 projectId) external view projectExists(projectId) returns (bool) {
        return projects[projectId].mrvApproved;
    }

    
    function changeVerifier(address newVerifier) external onlyOwner {
    require(newVerifier != address(0), "Invalid verifier address");
    require(newVerifier != verifier, "Already current verifier");
    address oldVerifier = verifier;
    verifier = newVerifier;

    emit VerifierChanged(oldVerifier, newVerifier);
    }
    
    function getProjectCID(uint256 projectId)
    external
    view
    projectExists(projectId)
    returns(string memory)
    {
    return projects[projectId].projectCID;
    }

    
    function getMRVCID(uint256 projectId)
    external
    view
    projectExists(projectId)
    returns(string memory)
    {
    return projects[projectId].mrvCID;
    }

    
    function getProjectOwner(uint256 projectId)
    external
    view
    projectExists(projectId)
    returns(address)
    {
    return projects[projectId].owner;
    }

    
    function getMintedCredits(uint256 projectId)
    external
    view
    projectExists(projectId)
    returns(uint256){
    return projects[projectId].mintedCredits;
    }

   
    function getAvailableCredits(uint256 projectId)
    external
    view
    projectExists(projectId)
    returns(uint256)
    {
    return projects[projectId].availableCredits;
    }

   
    function getRetiredCredits(uint256 projectId)
    external
    view
    projectExists(projectId)
    returns(uint256)
    {
    return projects[projectId].retiredCredits;
    }
    

}

