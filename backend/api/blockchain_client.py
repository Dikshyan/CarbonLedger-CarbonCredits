import os
import json
from web3 import Web3
from django.conf import settings

class CarbonLedgerClient:
    def __init__(self):
        node_url = os.getenv('BLOCKCHAIN_NODE_URL', 'http://127.0.0.1:8545')
        self.w3 = Web3(Web3.HTTPProvider(node_url))
        
        raw_address = os.getenv('CONTRACT_ADDRESS')
        if not raw_address:
            raise ValueError("CONTRACT_ADDRESS environment variable is missing.")
        
        self.contract_address = self.w3.to_checksum_address(raw_address)
        
        abi_path = os.path.join(
            settings.BASE_DIR, 
            '../blockchain/CarbonLedgerABI.json'
        )
        
        with open(abi_path, 'r') as f:
            self.contract_abi = json.load(f)
            
        self.contract = self.w3.eth.contract(
            address=self.contract_address, 
            abi=self.contract_abi
        )

    def is_connected(self):
        return self.w3.is_connected()

    def register_project(self, project_hash, owner_address):
        nonce = self.w3.eth.get_transaction_count(owner_address)
        tx = self.contract.functions.registerProject(project_hash).build_transaction({
            'from': owner_address,
            'nonce': nonce,
            'gas': 2000000,
            'gasPrice': self.w3.eth.gas_price
        })
        return tx
        
    def mint_credits(self, project_id, amount, owner_address):
        nonce = self.w3.eth.get_transaction_count(owner_address)
        tx = self.contract.functions.mintCredits(project_id, amount).build_transaction({
            'from': owner_address,
            'nonce': nonce,
            'gas': 2000000,
            'gasPrice': self.w3.eth.gas_price
        })
        return tx
        
    def retire_credits(self, project_id, amount, owner_address):
        nonce = self.w3.eth.get_transaction_count(owner_address)
        tx = self.contract.functions.retireCredits(project_id, amount).build_transaction({
            'from': owner_address,
            'nonce': nonce,
            'gas': 2000000,
            'gasPrice': self.w3.eth.gas_price
        })
        return tx
    